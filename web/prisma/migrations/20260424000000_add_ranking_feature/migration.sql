-- CreateEnum
CREATE TYPE "RankingKind" AS ENUM ('TAROTIST', 'SPREAD', 'CATEGORY', 'CARD', 'PERSONAL_CATEGORY');

-- CreateTable
CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ranking_snapshots" (
    "id" TEXT NOT NULL,
    "kind" "RankingKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ranking_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ranking_snapshots_kind_targetId_generatedAt_key" ON "ranking_snapshots"("kind", "targetId", "generatedAt");

-- CreateIndex
CREATE INDEX "ranking_snapshots_kind_generatedAt_rank_idx" ON "ranking_snapshots"("kind", "generatedAt", "rank");

-- CreateTable
CREATE TABLE "ranking_overrides" (
    "id" TEXT NOT NULL,
    "kind" "RankingKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ranking_overrides_kind_targetId_key" ON "ranking_overrides"("kind", "targetId");

-- CreateIndex
CREATE INDEX "ranking_overrides_kind_isActive_rank_idx" ON "ranking_overrides"("kind", "isActive", "rank");
