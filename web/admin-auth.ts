import { AdminPrismaAdapter } from "@/lib/server/admin-prisma-adapter";
import { logWithContext } from "@/lib/server/logger/logger";
import { adminUserRepository } from "@/lib/server/repositories/admin-user";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const {
  handlers: adminHandlers,
  auth: _rawAuth,
  signIn: adminSignIn,
  signOut: adminSignOut,
} = NextAuth({
  basePath: "/api/admin-auth",
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
      if (!user.email) return false;

      // email さえあればサインイン自体は許可し、AdminUser 行を Adapter 経由で
      // 自動作成する（activatedAt=null のまま）。管理画面への実アクセスは
      // adminAuth() の activatedAt チェックでブロックされる。
      //
      // 有効化の2パターン:
      //   A) 既存管理者が DB で activatedAt に現在時刻を直接セットする
      //   B) /admin/users から招待コードを送付し、招待者が pending ページで入力する
      return true;
    },

    async jwt({ token, user }) {
      if (user?.id) {
        token.adminUserId = user.id;
      }
      return token;
    },

    async session({ session, token }) {
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
    maxAge: 8 * 60 * 60, // 8時間
  },
});

export { adminHandlers, adminSignIn, adminSignOut };

/**
 * 生の NextAuth セッション（activatedAt チェックなし）。
 * /admin/auth/pending ページでメールアドレスを取得するために使用。
 */
export { _rawAuth as adminRawAuth };

/**
 * activatedAt チェック付きの管理者セッション取得。
 * activatedAt が null（未承認）の場合は null を返す。
 */
export async function adminAuth() {
  const session = await _rawAuth();
  if (!session?.user?.email) return null;

  const adminUser = await adminUserRepository.findByEmail(session.user.email);
  if (!adminUser?.activatedAt) return null;

  return session;
}
