import { createAppleClientSecret } from "@/lib/server/auth/apple-client-secret";
import { logWithContext } from "@/lib/server/logger/logger";
import { clientService } from "@/lib/server/services/client";
import { prisma } from "@/prisma/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

// Apple client_secret は Auth.js v5 の `AUTH_APPLE_SECRET` を使わず、起動時に
// .p8 秘密鍵から ES256 JWT を生成する方式に統一（180日失効問題を構造的に回避）。
// 必要な env が揃っていない環境（開発機など）では Apple プロバイダーを登録しない。
async function buildAppleProvider() {
  const teamId = process.env.AUTH_APPLE_TEAM_ID;
  const keyId = process.env.AUTH_APPLE_KEY_ID;
  const clientId = process.env.AUTH_APPLE_ID;
  const rawPrivateKey = process.env.AUTH_APPLE_PRIVATE_KEY;

  if (!teamId || !keyId || !clientId || !rawPrivateKey) {
    logWithContext("warn", "[Apple] Missing env vars, Apple provider disabled", {
      hasTeamId: !!teamId,
      hasKeyId: !!keyId,
      hasClientId: !!clientId,
      hasPrivateKey: !!rawPrivateKey,
    });
    return null;
  }

  const clientSecret = await createAppleClientSecret({
    teamId,
    keyId,
    clientId,
    privateKey: rawPrivateKey.replace(/\\n/g, "\n"),
    expiresIn: "180d",
  });

  return Apple({ clientId, clientSecret });
}

const appleProvider = await buildAppleProvider();

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    ...(appleProvider ? [appleProvider] : []),
    // E2E テスト専用 Credentials プロバイダー
    // OAuth フローなしでサインインフロー（jwt コールバック → Client 作成）を検証できる
    ...(process.env.E2E_MOCK_AUTH === "true"
      ? [
          Credentials({
            id: "e2e-credentials",
            name: "E2E Test Credentials",
            credentials: {
              email: { type: "email" },
            },
            async authorize(credentials) {
              const email = credentials?.email as string | undefined;
              if (!email?.endsWith("@e2e.test")) return null;
              // DB に User を upsert（OAuth の createUser 相当）
              const user = await prisma.user.upsert({
                where: { email },
                create: {
                  name: "E2E Test",
                  email,
                  emailVerified: new Date(),
                },
                update: {},
              });
              return { id: user.id, name: user.name, email: user.email };
            },
          }),
        ]
      : []),
  ],
  cookies: {
    sessionToken: {
      name: `__Secure-authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "none", // ← これが重要！
        path: "/",
        secure: true,
      },
    },
    callbackUrl: {
      name: `__Secure-authjs.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "none", // ← これが重要！
        path: "/",
        secure: true,
      },
    },
    csrfToken: {
      name: `__Host-authjs.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "none", // ← これが重要！
        path: "/",
        secure: true,
      },
    },
  },

  // ────────────────────────────────────────────────────────────
  // events — 診断用ログ
  // Prisma Adapter の createUser/linkAccount が発火したか可視化する。
  // staging / production のログを見れば、Adapter が動いていない場合に
  // 即検知できる。
  // ────────────────────────────────────────────────────────────
  events: {
    async createUser({ user }) {
      logWithContext("info", "[NextAuth.events.createUser]", {
        userId: user.id,
        email: user.email,
      });
    },
    async linkAccount({ account, user }) {
      logWithContext("info", "[NextAuth.events.linkAccount]", {
        userId: user.id,
        provider: account.provider,
      });
    },
    async signIn({ user, account, isNewUser }) {
      logWithContext("info", "[NextAuth.events.signIn]", {
        userId: user.id,
        provider: account?.provider,
        isNewUser,
      });
    },
  },

  callbacks: {
    async jwt({ token, account, user }) {
      // プロバイダー情報を保存
      if (account?.provider) {
        token.provider = account.provider;
      }

      // ユーザーIDを保存（初回ログイン時のみ）
      if (user?.id) {
        token.id = user.id;
      }

      // 初回ログイン時（user が渡される = サインイン直後）に Client を作成・更新
      if (user?.id) {
        try {
          logWithContext("info", "User signed in", { userId: user.id });
          const client = await clientService.getOrCreateForWebUser({
            userId: user.id,
            email: user.email ?? undefined,
            name: user.name ?? undefined,
            image: user.image ?? undefined,
            provider: account?.provider ?? "google",
          });
          await clientService.updateLoginDate(client.id);
          token.clientId = client.id;
          logWithContext("info", "Client ready", { clientId: client.id });
        } catch (error) {
          logWithContext("error", "Failed to create/update client in jwt callback", {
            error: error instanceof Error ? error.message : String(error),
            userId: user.id,
          });
        }
      }

      // ロールは毎回DBから取得（キャッシュによる権限昇格を防ぐ）
      // clientId が欠けている既存セッションはここで補完する（middleware の
      // access_token 自動発行で必要）
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            role: true,
            client: { select: { id: true, deletedAt: true } },
          },
        });
        // DB に User が存在しない（例: staging の DB リセット後に古い Cookie
        // が残っているケース）場合は JWT を無効化。null を返すとセッションが
        // 破棄され、pages の auth() → redirect("/auth/signin") が発動する。
        if (!dbUser) {
          logWithContext("warn", "[jwt] User not found in DB, invalidating session", {
            tokenId: token.id,
          });
          return null;
        }
        token.role = dbUser.role ?? "USER";
        if (!token.clientId && dbUser.client && !dbUser.client.deletedAt) {
          token.clientId = dbUser.client.id;
        }
      }

      return token;
    },

    async session({ session, token }) {
      // プロバイダー情報をセッションに追加
      if (token.provider) {
        session.provider = token.provider as string;
      }

      // ユーザーIDをセッションに追加
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }

      // ロールをセッションに追加
      if (session.user) {
        session.user.role = (token.role as string) ?? "USER";
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      logWithContext("info", "Redirect callback", { url, baseUrl });

      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return `${baseUrl}/`;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
});
