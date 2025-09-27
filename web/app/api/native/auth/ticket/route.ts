import { auth } from "@/auth";
import { SignJWT } from "jose";

const ALG = "HS256";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("unauthorized", { status: 401 });

  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
  // 30秒だけ有効な ticket（payloadは最小限）
  const ticket = await new SignJWT({ t: "ticket", sub: session.user.id })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30s")
    .sign(secret);

  return Response.json({ ticket });
}
