import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "@auth/core/adapters";
import { prisma } from "@/prisma/prisma";

export function AdminPrismaAdapter(): Adapter {
  return {
    async createUser(data: Omit<AdapterUser, "id">) {
      return prisma.adminUser.create({ data }) as Promise<AdapterUser>;
    },
    async getUser(id: string) {
      return prisma.adminUser.findUnique({ where: { id } }) as Promise<AdapterUser | null>;
    },
    async getUserByEmail(email: string) {
      return prisma.adminUser.findUnique({ where: { email } }) as Promise<AdapterUser | null>;
    },
    async getUserByAccount({
      providerAccountId,
      provider,
    }: Pick<AdapterAccount, "provider" | "providerAccountId">) {
      const account = await prisma.adminAccount.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      });
      return (account?.user ?? null) as AdapterUser | null;
    },
    async updateUser(data: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
      return prisma.adminUser.update({
        where: { id: data.id },
        data,
      }) as Promise<AdapterUser>;
    },
    async deleteUser(id: string) {
      await prisma.adminUser.delete({ where: { id } });
    },
    async linkAccount(data: AdapterAccount) {
      await prisma.adminAccount.create({
        data: data as Parameters<typeof prisma.adminAccount.create>[0]["data"],
      });
    },
    async unlinkAccount({
      providerAccountId,
      provider,
    }: Pick<AdapterAccount, "provider" | "providerAccountId">) {
      await prisma.adminAccount.delete({
        where: { provider_providerAccountId: { provider, providerAccountId } },
      });
    },
    async createSession(data: {
      sessionToken: string;
      userId: string;
      expires: Date;
    }) {
      return prisma.adminSession.create({ data }) as Promise<AdapterSession>;
    },
    async getSessionAndUser(sessionToken: string) {
      const result = await prisma.adminSession.findUnique({
        where: { sessionToken },
        include: { user: true },
      });
      if (!result) return null;
      const { user, ...session } = result;
      return { session: session as AdapterSession, user: user as AdapterUser };
    },
    async updateSession(
      data: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
    ) {
      return prisma.adminSession.update({
        where: { sessionToken: data.sessionToken },
        data,
      }) as Promise<AdapterSession>;
    },
    async deleteSession(sessionToken: string) {
      await prisma.adminSession.delete({ where: { sessionToken } });
    },
    async createVerificationToken(data: VerificationToken) {
      return prisma.adminVerificationToken.create({ data });
    },
    async useVerificationToken({
      identifier,
      token,
    }: {
      identifier: string;
      token: string;
    }) {
      try {
        return await prisma.adminVerificationToken.delete({
          where: { identifier_token: { identifier, token } },
        });
      } catch {
        return null;
      }
    },
  };
}
