import { prisma } from "@/prisma/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google, Apple],
  callbacks: {
    async jwt({ token, account, profile, user }) {
      console.log("JWT Callback:", { token, account, profile, user });
      // 初回ログイン時
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
        token.userId = user?.id || profile?.sub;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("Session Callback:", { session, token });
      return {
        ...session,
        accessToken: token.accessToken as string,
        userId: token.userId as string,
        provider: token.provider as string,
      };
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
});
