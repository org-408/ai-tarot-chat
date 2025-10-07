import { prisma } from "@/prisma/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Google from "next-auth/providers/google";
import { logWithContext } from "./lib/logger/logger";
import { clientService } from "./lib/services/client";

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
  callbacks: {
    async signIn({ user }) {
      await logWithContext("info", "Sign-in attempt", { user });
      // client と user が紐づいていたら、client.lastLoginAt を更新
      if (!user.id) return true;
      await logWithContext("info", "User signed in", { user });
      const client = await clientService.getClientByUserId(user.id);
      if (client) {
        await logWithContext("info", "Associated client found", { client });
        await clientService.updateLoginDate(client.id);
        await logWithContext("info", "Client lastLoginAt updated", {
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

      // ユーザーIDを保存（初回ログイン時）
      if (user?.id) {
        token.id = user.id; // ← 統一: token.id
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
        session.user.id = token.id as string; // ← 統一: session.user.id
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // callbackUrl が指定されている場合はそれを優先
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;

      // それ以外はデフォルト
      return `${baseUrl}/dashboard`;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
});
