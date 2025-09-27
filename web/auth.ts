import { prisma } from "@/prisma/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google, Apple],
  callbacks: {
    async jwt({ token, account, user }) {
      // 必要なら provider の種別だけ覚えておく（任意）
      if (account?.provider) token.provider = account.provider;
      if (user?.id) token.uid = user.id; // Prisma Adapter 経由
      return token;
    },
    async session({ session, token }) {
      session.provider = token.provider as string;
      session.userId = token.userId as string;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // 既存のフロー維持：/auth/mobile/callback 経由
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
});
