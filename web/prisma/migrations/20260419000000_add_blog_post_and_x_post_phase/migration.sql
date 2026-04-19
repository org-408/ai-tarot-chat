-- AlterEnum
ALTER TYPE "XPostType" ADD VALUE 'BUILD_IN_PUBLIC' BEFORE 'MANUAL';

-- CreateEnum
CREATE TYPE "XPostPhase" AS ENUM ('PRE_LAUNCH', 'POST_LAUNCH');

-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BlogPostType" AS ENUM ('TAROT_GUIDE', 'TAROT_TIP', 'APP_PROMO', 'BUILD_IN_PUBLIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "BlogPostPhase" AS ENUM ('PRE_LAUNCH', 'POST_LAUNCH');

-- AlterTable
ALTER TABLE "x_post_config" ADD COLUMN "phase" "XPostPhase" NOT NULL DEFAULT 'POST_LAUNCH';

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "coverImageUrl" TEXT,
    "tags" TEXT[],
    "metaDescription" TEXT,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "postType" "BlogPostType" NOT NULL DEFAULT 'MANUAL',
    "isAuto" BOOLEAN NOT NULL DEFAULT false,
    "prompt" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "autoPostEnabled" BOOLEAN NOT NULL DEFAULT false,
    "phase" "BlogPostPhase" NOT NULL DEFAULT 'POST_LAUNCH',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_post_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_status_idx" ON "blog_posts"("status");

-- CreateIndex
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_publishedAt_idx" ON "blog_posts"("publishedAt");
