-- FeatureFlag テーブルを削除（汎用フラグは使わず、機能ごとの Config テーブルに統一）
DROP TABLE IF EXISTS "feature_flags";

-- RankingSnapshot を時系列バケット構造に作り直す
-- （pre-launch でデータなし、かつ公開もまだなので破壊的変更 OK）
DROP TABLE IF EXISTS "ranking_snapshots";

CREATE TABLE "ranking_snapshots" (
    "id" TEXT NOT NULL,
    "kind" "RankingKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ranking_snapshots_kind_targetId_periodStart_key" ON "ranking_snapshots"("kind", "targetId", "periodStart");
CREATE INDEX "ranking_snapshots_kind_periodStart_idx" ON "ranking_snapshots"("kind", "periodStart");

-- RankingConfig を追加（singleton）
CREATE TABLE "ranking_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "collectionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ranking_config_pkey" PRIMARY KEY ("id")
);

-- singleton レコードを投入
INSERT INTO "ranking_config" ("id", "collectionEnabled", "publicEnabled", "updatedAt")
VALUES ('singleton', false, false, CURRENT_TIMESTAMP);
