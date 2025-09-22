// next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `auth()`, `useSession()`, `getSession()` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      // タロットアプリ固有のユーザー情報
      id: string;
      planId: string;
      isRegistered: boolean;
      planCode?: string;
      planName?: string;
      hasPersonal?: boolean;
      hasHistory?: boolean;
      primaryDeviceId?: string;

      // 使用状況情報
      dailyReadingsCount: number;
      dailyCelticsCount: number;
      dailyPersonalCount: number;
    } & DefaultSession["user"];
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User extends DefaultUser {
    id: string;
    planId?: string;
    isRegistered?: boolean;
    planCode?: string;
    planName?: string;
    hasPersonal?: boolean;
    hasHistory?: boolean;
    primaryDeviceId?: string;
    dailyReadingsCount?: number;
    dailyCelticsCount?: number;
    dailyPersonalCount?: number;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken()`, when using JWT sessions */
  interface JWT {
    id?: string;
    planId?: string;
    isRegistered?: boolean;
    planCode?: string;
    planName?: string;
    hasPersonal?: boolean;
    hasHistory?: boolean;
    primaryDeviceId?: string;
    dailyReadingsCount?: number;
    dailyCelticsCount?: number;
    dailyPersonalCount?: number;
  }
}
