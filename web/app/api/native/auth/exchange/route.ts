import { jwtVerify, SignJWT } from "jose";

const ALG = "HS256";

// 任意: アプリ用JWTの有効期限（例: 12h）
const APP_JWT_TTL = process.env.APP_JWT_TTL ?? "12h";

export async function POST(req: Request) {
  const { ticket } = await req.json().catch(() => ({}));
  if (!ticket) return new Response("invalid", { status: 400 });

  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

  try {
    const { payload } = await jwtVerify(ticket, secret, { algorithms: [ALG] });
    if (payload.t !== "ticket" || !payload.sub) throw new Error("bad-ticket");

    // ここで本来は「used ticket」を失効させるとより安全（Redis等）
    // 最小構成では短寿命＋署名検証で割り切る

    // アプリ用JWT（ユーザーIDのみをsubに格納）
    const appJwt = await new SignJWT({ t: "app", sub: String(payload.sub) })
      .setProtectedHeader({ alg: ALG })
      .setIssuedAt()
      .setExpirationTime(APP_JWT_TTL)
      .sign(secret);

    return Response.json({ token: appJwt, userId: payload.sub });
  } catch {
    return new Response("invalid", { status: 401 });
  }
}
