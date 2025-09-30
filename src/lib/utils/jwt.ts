import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";
const JWT_SECRET = "PkqVjlmc0fU69KYm4lTqTESJ73aoGZKPo8gFKbePE3Y="; // 環境変数などで管理推奨
const APP_JWT_TTL = "12h";

export async function generateJWT<T>(
  payload: T,
  secret: string = JWT_SECRET,
  ttl: string = APP_JWT_TTL
): Promise<string> {
  const jwtSecret = secret ?? JWT_SECRET;
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(new TextEncoder().encode(jwtSecret));
}

export async function decodeJWT<T>(
  token: string,
  secret: string = JWT_SECRET
): Promise<T> {
  const jwtSecret = secret ?? JWT_SECRET;
  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(jwtSecret),
    {
      algorithms: [ALG],
    }
  );
  if (payload.t !== "app" && payload.t !== "ticket")
    // "app" または "ticket" 以外は不正
    throw new Error("Invalid token type");
  return payload as unknown as T;
}
