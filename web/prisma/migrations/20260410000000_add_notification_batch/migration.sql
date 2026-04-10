-- AlterTable: EmailSubscription - remove notifiedAt, add unsubscribeToken and unsubscribedAt
ALTER TABLE "email_subscriptions" DROP COLUMN IF EXISTS "notifiedAt";
ALTER TABLE "email_subscriptions" ADD COLUMN "unsubscribeToken" VARCHAR(64);
ALTER TABLE "email_subscriptions" ADD COLUMN "unsubscribedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "email_subscriptions_unsubscribeToken_key" ON "email_subscriptions"("unsubscribeToken");

-- DropIndex
DROP INDEX IF EXISTS "email_subscriptions_notifiedAt_idx";

-- CreateIndex
CREATE INDEX "email_subscriptions_unsubscribedAt_idx" ON "email_subscriptions"("unsubscribedAt");

-- CreateTable: NotificationBatch
CREATE TABLE "notification_batches" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_batches_createdAt_idx" ON "notification_batches"("createdAt");

-- CreateTable: NotificationSent
CREATE TABLE "notification_sents" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_sents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_sents_batchId_subscriptionId_key" ON "notification_sents"("batchId", "subscriptionId");

-- CreateIndex
CREATE INDEX "notification_sents_batchId_idx" ON "notification_sents"("batchId");

-- CreateIndex
CREATE INDEX "notification_sents_subscriptionId_idx" ON "notification_sents"("subscriptionId");

-- AddForeignKey
ALTER TABLE "notification_sents" ADD CONSTRAINT "notification_sents_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "notification_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_sents" ADD CONSTRAINT "notification_sents_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "email_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
