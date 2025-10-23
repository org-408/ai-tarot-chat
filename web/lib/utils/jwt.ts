import { logWithContext } from "@/lib/server/logger/logger";
import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";
const JWT_SECRET = "PkqVjlmc0fU69KYm4lTqTESJ73aoGZKPo8gFKbePE3Y="; // 環境変数などで管理推奨
const APP_JWT_TTL = "12h";

export async function generateJWT<T>(
  payload: T,
  secret: string = JWT_SECRET,
  ttl: string = APP_JWT_TTL
): Promise<string> {
  logWithContext("info", "🔑 generateJWT payload:", { payload });
  const jwtSecret = secret ?? JWT_SECRET;
  logWithContext("info", "🔑 generateJWT secret:", { jwtSecret });
  logWithContext("info", "🔑 generateJWT ttl:", { ttl });
  const result = await new SignJWT(
    payload as unknown as Record<string, unknown>
  )
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(new TextEncoder().encode(jwtSecret));
  logWithContext("info", "🔑 generateJWT token:", { token: result });
  return result;
}

export async function decodeJWT<T>(
  token: string,
  secret: string = JWT_SECRET,
  ignoreExpiration = false
): Promise<T> {
  logWithContext("info", "🔑 decodeJWT token:", { token });
  const jwtSecret = secret ?? JWT_SECRET;
  logWithContext("info", "🔑 decodeJWT secret:", { jwtSecret });
  logWithContext("info", "🔑 decodeJWT ignoreExpiration:", {
    ignoreExpiration,
  });
  const { payload } = await jwtVerify(
    token,
    new TextEncoder().encode(jwtSecret),
    {
      algorithms: [ALG],
      currentDate: ignoreExpiration ? new Date(0) : undefined,
    }
  );
  if (payload.t !== "app" && payload.t !== "ticket") {
    // "app" または "ticket" 以外は不正
    logWithContext("error", "❌ Invalid token type:", { type: payload.t });
    throw new Error("Invalid token type");
  }
  logWithContext("info", "🔑 decodeJWT payload:", { payload });
  return payload as T;
}
