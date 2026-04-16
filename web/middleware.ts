import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API / auth / admin / 静的アセット / アプリページは intl ルーティングをスキップ
  // マーケティングページ (/ja/* /en/*) は next-intl が処理
  const skipIntl =
    pathname === "/" ||                        // スマートエントリ (session チェック後 /ja or /salon へ)
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/delete-account") ||
    pathname.startsWith("/admin") ||           // 管理画面
    pathname.startsWith("/signin") ||          // 管理者サインイン
    pathname.startsWith("/salon") ||           // アプリページ (locale なし)
    pathname.startsWith("/reading") ||
    pathname.startsWith("/personal") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/tarotists") ||
    pathname.startsWith("/plans") ||
    pathname.startsWith("/settings");

  // ✅ リクエストヘッダーを明示的に転送 (Next.js 16 対応)
  const requestHeaders = new Headers(req.headers);

  let res: NextResponse;
  if (skipIntl) {
    res = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    res = intlMiddleware(req) as NextResponse;
  }

  // CORS ヘッダー (モバイルアプリ対応)
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

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: res.headers });
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|tarotists|cards).*)",
  ],
};
