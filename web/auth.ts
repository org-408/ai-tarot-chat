import { logWithContext } from "@/lib/server/logger/logger";
import { clientService } from "@/lib/server/services/client";
import { prisma } from "@/prisma/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

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
    Apple,
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
            async authorize(credentials: Partial<Record<string, string>>) {
              const email = credentials?.email;
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

  callbacks: {
    async signIn({ user }) {
      logWithContext("info", "Sign-in attempt", { user });
      return true;
    },

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
      // signIn コールバックではなくここで行う理由:
      // Auth.js v5 では signIn コールバックが createUser (Prisma Adapter) より前に
      // 呼ばれる場合があり、その時点では User レコードが存在しない
      // jwt コールバックは createUser の後に呼ばれることが保証されている
      // user は初回ログイン時のみ渡される（セッション更新時は undefined）
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
          logWithContext("info", "Client ready", { clientId: client.id });
        } catch (error) {
          logWithContext("error", "Failed to create/update client in jwt callback", {
            error: error instanceof Error ? error.message : String(error),
            userId: user.id,
          });
        }
      }

      // ロールは毎回DBから取得（キャッシュによる権限昇格を防ぐ）
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "USER";
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
      return `${baseUrl}/salon`;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
});
