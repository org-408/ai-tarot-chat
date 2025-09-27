import "next-auth";

declare module "next-auth" {
  interface Session {
    userId: string;
    provider: string;
  }

  interface JWT {
    provider?: string;
  }
}
