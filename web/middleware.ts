import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  // req.auth に認証情報が入る
  console.log("Middleware auth:", req.auth);
  const res = NextResponse.next();
  const origin = req.headers.get("origin");
  if (origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.headers.set("Vary", "Origin");
  }

  // OPTIONS の場合は即レスで終了
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: res.headers });
  }

  return res;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
