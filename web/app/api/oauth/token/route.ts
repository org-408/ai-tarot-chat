import { NextRequest, NextResponse } from "next/server";
// Apple の client_secret(JWT) を作るユーティリティ（自作）
import { authService } from "@/lib/server/services/auth";

type Provider = "google" | "apple";

export async function POST(req: NextRequest) {
  const provider = (req.nextUrl.searchParams.get("provider") || "") as Provider;
  if (!["google", "apple"].includes(provider)) {
    return NextResponse.json(
      { error: "unsupported provider" },
      { status: 400 }
    );
  }

  const { code, code_verifier, redirect_uri } = (await req.json()) as {
    code: string;
    code_verifier?: string;
    redirect_uri: string;
  };

  try {
    let tokenRes: Response;
    if (provider === "google") {
      // サーバーで統一的に交換（シークレットはサーバーだけが知る）
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        redirect_uri,
      });
      if (code_verifier) body.set("code_verifier", code_verifier);

      tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
    } else {
      // Apple は必ずサーバー交換（client_secret が必要）
      const client_secret = await authService.createAppleClientSecret({
        teamId: process.env.AUTH_APPLE_TEAM_ID!,
        keyId: process.env.AUTH_APPLE_KEY_ID!,
        clientId: process.env.AUTH_APPLE_ID!,
        privateKey: process.env.APPLE_PRIVATE_KEY!,
      });

      const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.APPLE_SERVICE_ID!,
        client_secret,
        code,
        redirect_uri,
      });

      tokenRes = await fetch("https://appleid.apple.com/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
    }

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return NextResponse.json({ error: err }, { status: 400 });
    }

    const tokens = await tokenRes.json();
    // ここでユーザー照合・作成、自前JWT発行などを行ってもよい
    // 例: const appJwt = await issueAppJwtFromProviderTokens(tokens)
    return NextResponse.json(tokens);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "token exchange failed" },
      { status: 500 }
    );
  }
}
