// middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  // req.auth に認証情報が入る
  console.log("Middleware auth:", req.auth);

  // ✅ Next.js 16 対応: リクエストヘッダーを明示的に転送する
  //    Next.js 16 では NextResponse.next() だけではオリジナルのリクエストヘッダー
  //    (Authorization など) がルートハンドラーに届かない場合がある
  const requestHeaders = new Headers(req.headers);
  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const origin = req.headers.get("origin");
  if (origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-App-Token, User-Agent, X-Requested-With, Accept, Accept-Language"
    );
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Vary", "Origin");
  }

  // OPTIONS の場合は即レスで終了
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: res.headers });
  }

  return res;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|privacy|terms|delete-account).*)"],
};
