import { jwtVerify, SignJWT } from "jose";
import { getToken } from "next-auth/jwt";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const APP_TOKEN_COOKIE = "access_token";
const APP_JWT_ALG = "HS256";
const APP_JWT_TTL = "12h";
const APP_JWT_MAX_AGE_SEC = 60 * 60 * 12;
const NEXTAUTH_SESSION_COOKIE = "__Secure-authjs.session-token";

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API / auth / admin / 静的アセット / アプリページは intl ルーティングをスキップ
  // マーケティングページ (/ja/* /en/*) は next-intl が処理
  const skipIntl =
    pathname === "/" ||                        // ホームダッシュボード (認証チェックは (app) layout / app/page.tsx)
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/delete-account") ||
    pathname.startsWith("/admin") ||           // 管理画面
    pathname.startsWith("/signin") ||          // 管理者サインイン
    pathname.startsWith("/simple") ||          // アプリページ (locale なし)
    pathname.startsWith("/personal") ||
    pathname.startsWith("/clara") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/tarotists") ||
    pathname.startsWith("/plans") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/blog");              // ブログは locale 非依存ルート (app/blog/[slug])

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

  // Web ユーザー向け access_token 自動発行
  // NextAuth セッションはあるが access_token cookie が未発行の場合に発行する。
  // これによりサインイン直後の最初の API コールから認証が通り、
  // GUEST → FREE の反映遅延レースを避けられる。
  await issueAccessTokenIfNeeded(req, res);

  return res;
}

async function issueAccessTokenIfNeeded(req: NextRequest, res: NextResponse) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return;

  const existing = req.cookies.get(APP_TOKEN_COOKIE);

  let nextAuthToken;
  try {
    nextAuthToken = await getToken({
      req,
      secret,
      cookieName: NEXTAUTH_SESSION_COOKIE,
    });
  } catch {
    // セッショントークンが壊れている / 署名不一致などは静かに無視
    return;
  }

  // NextAuth セッションなし: サインアウト済み or 未サインイン。
  // 古い access_token が残っていれば削除（別アカウントでのサインイン直後に
  // 旧ユーザーの access_token を引きずらないため）。
  if (!nextAuthToken?.id || !nextAuthToken?.clientId) {
    if (existing) res.cookies.delete(APP_TOKEN_COOKIE);
    return;
  }

  const userId = nextAuthToken.id as string;
  const clientId = nextAuthToken.clientId as string;

  // 既存 access_token の user.id が NextAuth セッションと一致していればそのまま。
  // 不一致 / デコード失敗 / 未発行 の場合のみ新規発行する。
  if (existing) {
    try {
      const { payload } = await jwtVerify(
        existing.value,
        new TextEncoder().encode(secret)
      );
      const tokenUserId = (payload.user as { id?: string } | undefined)?.id;
      if (tokenUserId === userId) return;
    } catch {
      // 不正 / 期限切れ → 再発行に回す
    }
  }

  const provider = (nextAuthToken.provider as string | undefined) ?? "google";
  const email = (nextAuthToken.email as string | undefined) ?? undefined;
  const name = (nextAuthToken.name as string | undefined) ?? undefined;
  const image = (nextAuthToken.picture as string | undefined) ?? undefined;

  try {
    const appJwt = await new SignJWT({
      t: "app",
      deviceId: `web:${userId}`,
      clientId,
      provider,
      user: { id: userId, email, name, image },
    })
      .setProtectedHeader({ alg: APP_JWT_ALG })
      .setIssuedAt()
      .setExpirationTime(APP_JWT_TTL)
      .sign(new TextEncoder().encode(secret));

    res.cookies.set(APP_TOKEN_COOKIE, appJwt, {
      httpOnly: true,
      secure: true,
      path: "/",
      maxAge: APP_JWT_MAX_AGE_SEC,
      sameSite: "lax",
    });
  } catch (error) {
    console.warn("[proxy] Failed to issue access_token:", error);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|tarotists|cards).*)",
  ],
};
