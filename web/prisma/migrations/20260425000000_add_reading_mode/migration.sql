-- CreateEnum
CREATE TYPE "ReadingMode" AS ENUM ('QUICK', 'PERSONAL');

-- AlterTable
ALTER TABLE "Reading" ADD COLUMN "mode" "ReadingMode" NOT NULL DEFAULT 'QUICK';

-- Backfill: customQuestion IS NOT NULL → PERSONAL（パーソナル占いの履歴判別が
-- これまで customQuestion の有無に依存していたため、それを mode に転写する）。
UPDATE "Reading" SET "mode" = 'PERSONAL' WHERE "customQuestion" IS NOT NULL;

-- CreateIndex
CREATE INDEX "Reading_mode_idx" ON "Reading"("mode");
