import { createPrivateKey, createSign } from "crypto";

const DEFAULT_EXPIRES_IN_SEC = 180 * 24 * 60 * 60; // 180 日（Apple の最大値）

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

/**
 * Apple Sign In 用の client_secret (ES256 JWT) を同期的に生成する。
 *
 * Node 標準の `crypto` で実装し top-level await を避けているのは、
 * この関数を auth.ts から同期的に呼びたいため。tsx の CJS トランスパイル
 * 経路（prisma/seed.ts 等）で top-level await が使えない問題を回避する。
 */
export function createAppleClientSecret(opts: {
  teamId: string;
  keyId: string;
  clientId: string;
  privateKey: string;
  expiresInSec?: number;
}): string {
  const privKey = createPrivateKey(opts.privateKey);

  const header = { alg: "ES256", kid: opts.keyId, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: opts.teamId,
    iat: now,
    exp: now + (opts.expiresInSec ?? DEFAULT_EXPIRES_IN_SEC),
    aud: "https://appleid.apple.com",
    sub: opts.clientId,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

  const signer = createSign("SHA256");
  signer.update(signingInput);
  signer.end();
  // ES256 は JOSE 仕様上 IEEE P1363 形式（r||s の 64 バイト固定長）
  const signature = signer.sign({ key: privKey, dsaEncoding: "ieee-p1363" });

  return `${signingInput}.${base64url(signature)}`;
}
