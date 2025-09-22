import { migrateGuestUser } from "@/lib/services/user-service";
import { prisma } from "@/prisma/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Apple({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      console.log("🔐 OAuth認証:", {
        provider: account?.provider,
        email: user.email,
      });

      // Apple認証でメール取得失敗
      if (account?.provider === "apple" && !user.email) {
        console.error("Apple認証でメール取得失敗");
        return "/auth/error?error=AppleEmailMissing";
      }

      // メールアドレス必須チェック
      if (!user.email) {
        console.error("メールアドレス取得失敗");
        return "/auth/error?error=NoEmail";
      }

      // Cookieからデバイス ID を取得
      const cookieStore = cookies();
      const deviceId = (await cookieStore).get("device_id")?.value || "";

      // ゲストユーザー移行処理
      try {
        await migrateGuestUser({
          deviceId,
          email: user.email,
          name: user.name,
          image: user.image,
        });
        console.log("✅ ゲストユーザー移行完了");
      } catch (error) {
        console.error("❌ ゲストユーザー移行エラー:", error);
      }

      return true;
    },

    async session({ session, token }) {
      if (token && session.user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email! },
          include: {
            plan: true,
            devices: {
              orderBy: { lastSeenAt: "desc" },
              take: 1,
            },
          },
        });

        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.planId = dbUser.planId;
          session.user.isRegistered = dbUser.isRegistered;
          session.user.planCode = dbUser.plan?.code;
          session.user.planName = dbUser.plan?.name;
          session.user.hasPersonal = dbUser.plan?.hasPersonal ?? false;
          session.user.hasHistory = dbUser.plan?.hasHistory ?? false;
          session.user.primaryDeviceId = dbUser.devices?.[0]?.deviceId;
          session.user.dailyReadingsCount = dbUser.dailyReadingsCount;
          session.user.dailyCelticsCount = dbUser.dailyCelticsCount;
          session.user.dailyPersonalCount = dbUser.dailyPersonalCount;

          // 最終ログイン時刻更新
          prisma.user
            .update({
              where: { id: dbUser.id },
              data: { lastLoginAt: new Date() },
            })
            .catch(console.error);
        }
      }
      return session;
    },

    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: {
            plan: true,
            devices: {
              orderBy: { lastSeenAt: "desc" },
              take: 1,
            },
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.planId = dbUser.planId;
          token.isRegistered = dbUser.isRegistered;
          token.planCode = dbUser.plan?.code;
          token.planName = dbUser.plan?.name;
          token.hasPersonal = dbUser.plan?.hasPersonal ?? false;
          token.hasHistory = dbUser.plan?.hasHistory ?? false;
          token.primaryDeviceId = dbUser.devices?.[0]?.deviceId;
          token.dailyReadingsCount = dbUser.dailyReadingsCount;
          token.dailyCelticsCount = dbUser.dailyCelticsCount;
          token.dailyPersonalCount = dbUser.dailyPersonalCount;
        }
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  pages: {
    error: "/auth/error",
  },
});
