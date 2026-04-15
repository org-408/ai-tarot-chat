/**
 * POST /api/auth/web-session
 *
 * Web フロントエンド専用。NextAuth セッションを持つユーザーに対して
 * アプリ用 JWT を発行し access_token cookie にセットする。
 *
 * 1. NextAuth セッション確認
 * 2. userId に対応する Client を find or create
 * 3. アプリ用 JWT を生成して access_token cookie にセット
 * 4. { clientId, userId } を返す
 */

import { auth } from "@/auth";
import { logWithContext } from "@/lib/server/logger/logger";
import { clientService } from "@/lib/server/services";
import { generateJWT } from "@/lib/utils/jwt";
import type { AppJWTPayload } from "@/../shared/lib/types";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.AUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error("AUTH_SECRET environment variable is required");
}

const TOKEN_KEY = "access_token";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      logWithContext("warn", "[web-session] No NextAuth session");
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email ?? undefined;
    const userName = session.user.name ?? undefined;
    const userImage = session.user.image ?? undefined;
    const provider = (session as { provider?: string }).provider ?? "google";

    // Client を find or create
    const client = await clientService.getOrCreateForWebUser({
      userId,
      email: userEmail,
      name: userName,
      image: userImage,
      provider,
    });
    logWithContext("info", "[web-session] Client ready", { clientId: client.id, userId });

    // Web ユーザーは deviceId を "web:{userId}" 形式で扱う
    const deviceId = `web:${userId}`;

    // アプリ用 JWT を生成
    const token = await generateJWT<AppJWTPayload>(
      {
        t: "app",
        deviceId,
        clientId: client.id,
        provider,
        user: {
          id: userId,
          email: userEmail,
          name: userName,
          image: userImage,
        },
      },
      JWT_SECRET
    );

    logWithContext("info", "[web-session] App JWT generated", { clientId: client.id });

    const res = NextResponse.json({ clientId: client.id, userId });

    res.cookies.set(TOKEN_KEY, token, {
      httpOnly: true,
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 12, // 12時間
      sameSite: "lax",
    });

    return res;
  } catch (error) {
    logWithContext("error", "[web-session] Error", { error });
    return NextResponse.json({ error: "セッション初期化に失敗しました" }, { status: 500 });
  }
}
