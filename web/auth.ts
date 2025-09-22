import { createOrUpdateUserFromGoogle } from "@/lib/services/user-service";
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

const providers: Provider[] = [
  Credentials({
    credentials: { password: { label: "Password", type: "password" } },
    authorize(c) {
      if (c.password !== "password") return null;
      return {
        id: "test",
        name: "Test User",
        email: "test@example.com",
      };
    },
  }),
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorization: {
      params: {
        scope: "openid email profile",
      },
    },
    async profile(profile, tokens) {
      console.log("Google profile", profile);
      console.log("Google tokens", tokens);
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
      };
    },
  }),
  GitHub({
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    authorization: {
      params: {
        scope: "user:email read:user",
      },
    },
    async profile(profile, tokens) {
      console.log("GitHub profile", profile);
      console.log("GitHub tokens", tokens);
      return {
        id: profile.id.toString(),
        name: profile.name,
        email: profile.email,
        image: profile.avatar_url,
      };
    },
  }),
  Apple({
    clientId: process.env.APPLE_CLIENT_ID,
    clientSecret: process.env.APPLE_CLIENT_SECRET,
    authorization: {
      params: {
        scope: "user:email read:user",
      },
    },
    async profile(profile, tokens) {
      console.log("GitHub profile", profile);
      console.log("GitHub tokens", tokens);
      return {
        id: profile.id.toString(),
        name: profile.name,
        email: profile.email,
        image: profile.avatar_url,
      };
    },
  }),
];

export const providerMap = providers
  .map((provider) => {
    if (typeof provider === "function") {
      const providerData = provider();
      return { id: providerData.id, name: providerData.name };
    } else {
      return { id: provider.id, name: provider.name };
    }
  })
  .filter((provider) => provider.id !== "credentials");

export const { handlers, auth, signIn, signOut } = NextAuth({
  // adapter: PrismaAdapter(prisma), //  ⨯ [Error [TypeError]: Cannot read properties of undefined (reading 'exec')]
  session: {
    strategy: "jwt",
  },
  providers,
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error", // Error code passed in query string as ?error=
  },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    // 🎯 自動ユーザー登録
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        try {
          const googleUserData = {
            email: user.email,
            name: user.name || "",
            image: user.image || null, // null も明示的に処理
            sub: account.providerAccountId,
          };

          const dbUser = await createOrUpdateUserFromGoogle(googleUserData);

          // ユーザーオブジェクトにDB情報を追加
          user.id = dbUser.id;
          user.planType = dbUser.planType;
          user.isRegistered = dbUser.isRegistered;

          console.log(`✅ User auto-registered/updated: ${user.email}`);
          return true;
        } catch (error) {
          console.error("❌ Auto user registration failed:", error);
          return true; // 認証自体は成功させる
        }
      }

      return true;
    },

    async jwt({ token, user, account }) {
      // 初回ログイン時にユーザー情報をトークンに保存
      if (user) {
        token.userId = user.id;
        token.planType = user.planType;
        token.isRegistered = user.isRegistered;
      }

      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }

      return token;
    },

    async session({ session, token }) {
      // セッションにユーザー情報を含める
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.user.planType = token.planType as string;
        session.user.isRegistered = token.isRegistered as boolean;
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.includes("/auth/tauri-callback")) {
        return url;
      }

      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (new URL(url).origin === baseUrl) {
        return url;
      }

      return baseUrl;
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      console.log(
        `🎉 User signed in: ${user.email}${
          isNewUser ? " (New User)" : " (Returning User)"
        }`
      );

      if (isNewUser) {
        console.log("📝 New user onboarding triggered");
      }
    },

    async signOut() {
      console.log("👋 User signed out");
    },
  },
});
