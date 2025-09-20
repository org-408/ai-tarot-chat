import { auth } from "@/auth";

export default auth((req) => {
  // req.auth に認証情報が入る
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
