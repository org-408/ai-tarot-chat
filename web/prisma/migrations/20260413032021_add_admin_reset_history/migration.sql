-- CreateTable
CREATE TABLE "AdminResetHistory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "resetType" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "reason" TEXT,
    "beforeReadingsCount" INTEGER NOT NULL DEFAULT 0,
    "beforePersonalCount" INTEGER NOT NULL DEFAULT 0,
    "afterReadingsCount" INTEGER NOT NULL DEFAULT 0,
    "afterPersonalCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminResetHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminResetHistory_clientId_idx" ON "AdminResetHistory"("clientId");

-- AddForeignKey
ALTER TABLE "AdminResetHistory" ADD CONSTRAINT "AdminResetHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
