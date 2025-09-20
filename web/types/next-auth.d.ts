import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      planType: string;
      isRegistered: boolean;
    };
    accessToken?: string;
    refreshToken?: string;
  }

  interface User {
    id: string;
    planType?: string;
    isRegistered?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    planType?: string;
    isRegistered?: boolean;
    accessToken?: string;
    refreshToken?: string;
  }
}
