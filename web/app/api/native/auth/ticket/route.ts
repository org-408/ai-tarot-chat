import { auth } from "@/auth";
import { SignJWT } from "jose";

const ALG = "HS256";

export async function GET() {
  console.log("📍 /api/native/auth/ticket - チケット発行リクエスト受信");

  const session = await auth();

  if (!session?.user?.id) {
    console.error("❌ 認証されていません");
    return new Response("unauthorized", { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);

    // 30秒間有効なチケットを発行
    const ticket = await new SignJWT({
      t: "ticket",
      sub: session.user.id,
    })
      .setProtectedHeader({ alg: ALG })
      .setIssuedAt()
      .setExpirationTime("30s")
      .sign(secret);

    console.log(`✅ チケット発行成功 (userId: ${session.user.id})`);
    return Response.json({ ticket });
  } catch (error) {
    console.error("❌ チケット発行エラー:", error);
    return new Response("ticket generation failed", { status: 500 });
  }
}
