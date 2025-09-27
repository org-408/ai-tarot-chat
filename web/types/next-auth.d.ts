import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    provider?: string;
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    provider?: string;
  }
}
