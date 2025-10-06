import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";
const JWT_SECRET = "PkqVjlmc0fU69KYm4lTqTESJ73aoGZKPo8gFKbePE3Y="; // 環境変数などで管理推奨
const APP_JWT_TTL = "12h";

export async function generateJWT<T>(
  payload: T,
  secret: string = JWT_SECRET,
  ttl: string = APP_JWT_TTL
): Promise<string> {
  console.log("🔑 generateJWT payload", payload);
  const jwtSecret = secret ?? JWT_SECRET;
  console.log("🔑 generateJWT secret", jwtSecret);
  console.log("🔑 generateJWT ttl", ttl);
  const result =  await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(new TextEncoder().encode(jwtSecret));
  console.log("🔑 generateJWT token", result);
  return result;
}

export async function decodeJWT<T>(
  token: string,
  secret: string = JWT_SECRET,
  ignoreExpiration = false
): Promise<T & { exp?: number }> {
  console.log("🔑 decodeJWT token", token);
  const jwtSecret = secret ?? JWT_SECRET;
  console.log("🔑 decodeJWT secret", jwtSecret);
  console.log("🔑 decodeJWT ignoreExpiration", ignoreExpiration);
  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(jwtSecret),
    {
      algorithms: [ALG],
      currentDate: ignoreExpiration ? new Date(0) : undefined,
    },
  );
  if (payload.t !== "app" && payload.t !== "ticket") {
    // "app" または "ticket" 以外は不正
    console.log("❌ Invalid token type:", payload.t);
    throw new Error("Invalid token type");
  }
  console.log("🔑 decodeJWT payload", payload);
  return payload as T & { exp?: number};
}
