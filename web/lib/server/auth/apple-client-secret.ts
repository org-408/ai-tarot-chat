import { importPKCS8, SignJWT } from "jose";

export async function createAppleClientSecret(opts: {
  teamId: string;
  keyId: string;
  clientId: string;
  privateKey: string;
  expiresIn?: string | number;
}): Promise<string> {
  const alg = "ES256";
  const ecKey = await importPKCS8(opts.privateKey, alg);
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({})
    .setProtectedHeader({ alg, kid: opts.keyId })
    .setIssuer(opts.teamId)
    .setSubject(opts.clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(opts.expiresIn ?? "180d")
    .sign(ecKey);
}
