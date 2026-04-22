-- CreateEnum
CREATE TYPE "FeatureQueueStatus" AS ENUM ('PENDING', 'PUBLISHED');

-- AlterEnum
ALTER TYPE "BlogPostType" ADD VALUE 'DAILY_CARD';

-- AlterTable
ALTER TABLE "x_posts" ADD COLUMN "linkedBlogPostId" TEXT;

-- CreateIndex
CREATE INDEX "x_posts_postType_createdAt_idx" ON "x_posts"("postType", "createdAt");

-- CreateIndex
CREATE INDEX "blog_posts_postType_createdAt_idx" ON "blog_posts"("postType", "createdAt");

-- CreateTable
CREATE TABLE "blog_feature_queue" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "FeatureQueueStatus" NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "blogPostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_feature_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_feature_queue_status_sortOrder_idx" ON "blog_feature_queue"("status", "sortOrder");
