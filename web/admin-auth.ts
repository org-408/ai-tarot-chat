import { AdminPrismaAdapter } from "@/lib/server/admin-prisma-adapter";
import { logWithContext } from "@/lib/server/logger/logger";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const {
  handlers: adminHandlers,
  auth: adminAuth,
  signIn: adminSignIn,
  signOut: adminSignOut,
} = NextAuth({
  adapter: AdminPrismaAdapter(),
  providers: [
    Google({
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  // Admin 専用 cookie 名（通常ユーザーの auth.ts と衝突しない名前）
  cookies: {
    sessionToken: {
      name: `__Secure-admin-authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
    callbackUrl: {
      name: `__Secure-admin-authjs.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
    csrfToken: {
      name: `__Host-admin-authjs.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
  },

  callbacks: {
    async signIn({ user }) {
      logWithContext("info", "[AdminAuth] Sign-in attempt", { user });
      return true;
    },

    async jwt({ token, user }) {
      // 管理者ユーザーIDを保存（初回ログイン時のみ）
      if (user?.id) {
        token.adminUserId = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      // 管理者ユーザーIDをセッションに追加
      if (token.adminUserId && session.user) {
        session.user.id = token.adminUserId as string;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      logWithContext("info", "[AdminAuth] Redirect callback", { url, baseUrl });

      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return `${baseUrl}/admin`;
    },
  },

  pages: {
    signIn: "/admin/auth/signin",
  },

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8時間（管理者セッションは短め）
  },
});
