import { prisma } from "@/prisma/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google, Apple],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        // 👇 重要！プロバイダーごとに異なるトークンを使う
        if (account.provider === "apple") {
          token.accessToken = account.id_token; // 👈 id_tokenを使う
          token.appleIdToken = account.id_token;
        } else {
          token.accessToken = account.access_token;
        }

        token.provider = account.provider;
        token.userId = account.providerAccountId;

        // Apple: 初回のみユーザー情報が来る
        if (account.provider === "apple" && profile) {
          token.email = profile.email || token.email;
          token.name = profile.name || token.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.provider = token.provider as string;
      session.userId = token.userId as string;

      // Apple用の追加情報
      if (token.provider === "apple") {
        session.idToken = token.appleIdToken as string;
      }

      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
});
