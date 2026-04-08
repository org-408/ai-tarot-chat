import { logWithContext } from "@/lib/server/logger/logger";
import { clientService } from "@/lib/server/services/client";
import { prisma } from "@/prisma/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
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
      // client と user が紐づいていたら、client.lastLoginAt を更新
      if (!user.id) return true;
      logWithContext("info", "User signed in", { user });
      const client = await clientService.getClientByUserId(user.id);
      if (client) {
        logWithContext("info", "Associated client found", { client });
        await clientService.updateLoginDate(client.id);
        logWithContext("info", "Client lastLoginAt updated", {
          clientId: client.id,
        });
      }
      return true;
    },

    async jwt({ token, account, user }) {
      // プロバイダー情報を保存
      if (account?.provider) {
        token.provider = account.provider;
      }

      // ユーザーIDとロールを保存（初回ログイン時のみ）
      if (user?.id) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
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
      // ⭐ デバッグログ追加（サーバーログに出力）
      console.log("🔀 redirect callback called", {
        url,
        baseUrl,
        urlStartsWithSlash: url.startsWith("/"),
        urlStartsWithBase: url.startsWith(baseUrl),
      });

      logWithContext("info", "Redirect callback", {
        url,
        baseUrl,
      });

      // callbackUrl が指定されている場合はそれを優先
      if (url.startsWith("/")) {
        const result = `${baseUrl}${url}`;
        console.log("✅ Redirecting to (relative path):", result);
        logWithContext("info", "Redirect decision: relative path", {
          result,
        });
        return result;
      }

      if (url.startsWith(baseUrl)) {
        console.log("✅ Redirecting to (absolute URL):", url);
        logWithContext("info", "Redirect decision: absolute URL", { url });
        return url;
      }

      // それ以外はデフォルト
      const defaultUrl = `${baseUrl}/dashboard`;
      console.log("⚠️ Redirecting to (default):", defaultUrl);
      logWithContext("info", "Redirect decision: default", { defaultUrl });
      return defaultUrl;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
});
