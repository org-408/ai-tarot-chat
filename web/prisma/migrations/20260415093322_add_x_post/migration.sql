-- CreateEnum
CREATE TYPE "XPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'POSTED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "XPostType" AS ENUM ('DAILY_CARD', 'APP_PROMO', 'TAROT_TIP', 'MANUAL');

-- CreateTable
CREATE TABLE "x_posts" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tweetId" TEXT,
    "status" "XPostStatus" NOT NULL DEFAULT 'DRAFT',
    "postType" "XPostType" NOT NULL DEFAULT 'MANUAL',
    "error" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "isAuto" BOOLEAN NOT NULL DEFAULT false,
    "prompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "x_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "x_posts_status_idx" ON "x_posts"("status");

-- CreateIndex
CREATE INDEX "x_posts_scheduledAt_idx" ON "x_posts"("scheduledAt");
