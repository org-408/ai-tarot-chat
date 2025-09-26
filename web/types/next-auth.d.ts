import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    userId: string;
    provider: string;
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface JWT {
    accessToken?: string;
    userId?: string;
    provider?: string;
  }
}
