import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    userId: string;
    provider: string;
    user: {
      id: string;
    } & DefaultSession["user"];
    // Apple用の追加情報
    idToken?: string;
  }

  interface JWT {
    accessToken?: string;
    userId?: string;
    provider?: string;
  }
}
