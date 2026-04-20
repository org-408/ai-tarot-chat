-- ============================================================
-- Reading / ChatMessage の所有関係を Client 中心に修正する
--
-- 背景:
--   Reading / ChatMessage は本来 Client 所属のエンティティだが、
--   ゲストユーザー対応の過渡期（2025-09-24）に誤って Device 中心の
--   設計に寄ってしまい、clientId 必須化（2025-10-09）後も
--   Reading.deviceId 必須・ChatMessage.clientId optional の
--   中途半端な状態が残っていた。本マイグレーションで当初仕様に戻す。
--
-- 変更内容:
--   1. Reading.deviceId を optional 化（Web ユーザーは Device を持たない）
--   2. ChatMessage.clientId を required 化（Reading 経由で必ず取得可能）
--      既存データは Reading.clientId で backfill
--   3. ChatMessage.deviceId を削除（Reading 経由で辿れるため正規化違反）
-- ============================================================

-- ------------------------------------------------------------
-- 1. Reading.deviceId を optional 化
-- ------------------------------------------------------------
ALTER TABLE "Reading" ALTER COLUMN "deviceId" DROP NOT NULL;

-- ------------------------------------------------------------
-- 2. ChatMessage.clientId を required 化
-- ------------------------------------------------------------
-- 2-1. NULL の ChatMessage を Reading.clientId から backfill
UPDATE "ChatMessage" cm
SET "clientId" = r."clientId"
FROM "Reading" r
WHERE cm."readingId" = r."id" AND cm."clientId" IS NULL;

-- 2-2. FK 制約を一旦外す（SET NULL → 後で CASCADE 相当の挙動に戻す前提で張り直し）
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_clientId_fkey";

-- 2-3. NOT NULL 化
ALTER TABLE "ChatMessage" ALTER COLUMN "clientId" SET NOT NULL;

-- 2-4. FK を張り直す（Client 削除は RESTRICT: ChatMessage が残るなら Client は消せない）
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ------------------------------------------------------------
-- 3. ChatMessage.deviceId を削除
-- ------------------------------------------------------------
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_deviceId_fkey";
DROP INDEX "ChatMessage_deviceId_idx";
ALTER TABLE "ChatMessage" DROP COLUMN "deviceId";
