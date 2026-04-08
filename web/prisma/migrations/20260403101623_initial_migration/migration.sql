-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProviderKey" AS ENUM ('GPT5NANO', 'GEMINI25', 'GEMINI25PRO', 'GPT41', 'GPT5', 'CLAUDE_H', 'CLAUDE_S', 'OFFLINE');

-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('CARD_INTERPRETATION', 'USER_RESPONSE', 'FINAL_READING', 'USER_QUESTION', 'TAROTIST_ANSWER');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'TAROTIST');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "clientId" TEXT,
    "platform" TEXT,
    "appVersion" TEXT,
    "osVersion" TEXT,
    "pushToken" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "planId" TEXT NOT NULL,
    "dailyReadingsCount" INTEGER NOT NULL DEFAULT 0,
    "lastReadingDate" TIMESTAMP(3),
    "dailyPersonalCount" INTEGER NOT NULL DEFAULT 0,
    "lastPersonalReadingDate" TIMESTAMP(3),
    "isRegistered" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyResetHistory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "resetType" TEXT NOT NULL,
    "beforeReadingsCount" INTEGER NOT NULL DEFAULT 0,
    "afterReadingsCount" INTEGER NOT NULL DEFAULT 0,
    "beforePersonalCount" INTEGER NOT NULL DEFAULT 0,
    "afterPersonalCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyResetHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarotDeck" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "totalCards" INTEGER NOT NULL,
    "sources" TEXT[],
    "optimizedFor" TEXT NOT NULL,
    "primaryFocus" TEXT NOT NULL,
    "categories" TEXT[],
    "status" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TarotDeck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarotCard" (
    "id" TEXT NOT NULL,
    "no" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "suit" TEXT,
    "element" TEXT,
    "zodiac" TEXT,
    "uprightKeywords" TEXT[],
    "reversedKeywords" TEXT[],
    "promptContext" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "deckId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TarotCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardMeaning" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "upright" TEXT NOT NULL,
    "reversed" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardMeaning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpreadLevel" (
    "id" TEXT NOT NULL,
    "no" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpreadLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spread" (
    "id" TEXT NOT NULL,
    "no" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "guide" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpreadCell" (
    "id" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isHorizontal" BOOLEAN NOT NULL DEFAULT false,
    "spreadId" TEXT NOT NULL,

    CONSTRAINT "SpreadCell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingCategory" (
    "id" TEXT NOT NULL,
    "no" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpreadToCategory" (
    "id" TEXT NOT NULL,
    "spreadId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "SpreadToCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "no" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "features" TEXT[],
    "maxReadings" INTEGER NOT NULL DEFAULT 0,
    "maxPersonal" INTEGER NOT NULL DEFAULT 0,
    "hasPersonal" BOOLEAN NOT NULL DEFAULT false,
    "hasHistory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanChangeHistory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "fromPlanId" TEXT NOT NULL,
    "toPlanId" TEXT NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanChangeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarotist" (
    "id" TEXT NOT NULL,
    "no" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "trait" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "provider" "ProviderKey",
    "model" TEXT,
    "cost" TEXT,
    "quality" INTEGER DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "planId" TEXT NOT NULL,

    CONSTRAINT "Tarotist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reading" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "tarotistId" TEXT NOT NULL,
    "spreadId" TEXT NOT NULL,
    "categoryId" TEXT,
    "customQuestion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawnCard" (
    "id" TEXT NOT NULL,
    "readingId" TEXT,
    "cardId" TEXT NOT NULL,
    "keywords" TEXT[],
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "position" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "isHorizontal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawnCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "deviceId" TEXT,
    "tarotistId" TEXT,
    "chatType" "ChatType" NOT NULL,
    "readingId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteSpread" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "spreadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteSpread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "clientId" TEXT,
    "path" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'web_server',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "used_tickets" (
    "id" TEXT NOT NULL,
    "ticketHash" VARCHAR(64) NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "used_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_subscriptions" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "platform" VARCHAR(20),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceId_key" ON "Device"("deviceId");

-- CreateIndex
CREATE INDEX "Device_clientId_idx" ON "Device"("clientId");

-- CreateIndex
CREATE INDEX "Device_lastSeenAt_idx" ON "Device"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Client_userId_key" ON "Client"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_planId_idx" ON "Client"("planId");

-- CreateIndex
CREATE INDEX "DailyResetHistory_clientId_date_idx" ON "DailyResetHistory"("clientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TarotDeck_name_language_key" ON "TarotDeck"("name", "language");

-- CreateIndex
CREATE INDEX "TarotCard_deckId_idx" ON "TarotCard"("deckId");

-- CreateIndex
CREATE UNIQUE INDEX "TarotCard_code_language_key" ON "TarotCard"("code", "language");

-- CreateIndex
CREATE UNIQUE INDEX "CardMeaning_cardId_category_language_key" ON "CardMeaning"("cardId", "category", "language");

-- CreateIndex
CREATE UNIQUE INDEX "SpreadLevel_no_key" ON "SpreadLevel"("no");

-- CreateIndex
CREATE UNIQUE INDEX "SpreadLevel_code_key" ON "SpreadLevel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Spread_no_key" ON "Spread"("no");

-- CreateIndex
CREATE UNIQUE INDEX "Spread_code_key" ON "Spread"("code");

-- CreateIndex
CREATE INDEX "Spread_levelId_idx" ON "Spread"("levelId");

-- CreateIndex
CREATE INDEX "Spread_planId_idx" ON "Spread"("planId");

-- CreateIndex
CREATE INDEX "SpreadCell_spreadId_idx" ON "SpreadCell"("spreadId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingCategory_no_key" ON "ReadingCategory"("no");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingCategory_name_key" ON "ReadingCategory"("name");

-- CreateIndex
CREATE INDEX "SpreadToCategory_categoryId_idx" ON "SpreadToCategory"("categoryId");

-- CreateIndex
CREATE INDEX "SpreadToCategory_spreadId_idx" ON "SpreadToCategory"("spreadId");

-- CreateIndex
CREATE UNIQUE INDEX "SpreadToCategory_spreadId_categoryId_key" ON "SpreadToCategory"("spreadId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_no_key" ON "Plan"("no");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE INDEX "PlanChangeHistory_clientId_idx" ON "PlanChangeHistory"("clientId");

-- CreateIndex
CREATE INDEX "PlanChangeHistory_fromPlanId_idx" ON "PlanChangeHistory"("fromPlanId");

-- CreateIndex
CREATE INDEX "PlanChangeHistory_toPlanId_idx" ON "PlanChangeHistory"("toPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "Tarotist_no_key" ON "Tarotist"("no");

-- CreateIndex
CREATE UNIQUE INDEX "Tarotist_name_key" ON "Tarotist"("name");

-- CreateIndex
CREATE INDEX "Reading_clientId_idx" ON "Reading"("clientId");

-- CreateIndex
CREATE INDEX "Reading_deviceId_idx" ON "Reading"("deviceId");

-- CreateIndex
CREATE INDEX "Reading_tarotistId_idx" ON "Reading"("tarotistId");

-- CreateIndex
CREATE INDEX "Reading_spreadId_idx" ON "Reading"("spreadId");

-- CreateIndex
CREATE INDEX "Reading_categoryId_idx" ON "Reading"("categoryId");

-- CreateIndex
CREATE INDEX "DrawnCard_readingId_idx" ON "DrawnCard"("readingId");

-- CreateIndex
CREATE INDEX "DrawnCard_cardId_idx" ON "DrawnCard"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "DrawnCard_readingId_order_key" ON "DrawnCard"("readingId", "order");

-- CreateIndex
CREATE INDEX "ChatMessage_clientId_idx" ON "ChatMessage"("clientId");

-- CreateIndex
CREATE INDEX "ChatMessage_deviceId_idx" ON "ChatMessage"("deviceId");

-- CreateIndex
CREATE INDEX "ChatMessage_tarotistId_idx" ON "ChatMessage"("tarotistId");

-- CreateIndex
CREATE INDEX "ChatMessage_readingId_idx" ON "ChatMessage"("readingId");

-- CreateIndex
CREATE INDEX "ChatMessage_chatType_idx" ON "ChatMessage"("chatType");

-- CreateIndex
CREATE INDEX "ChatMessage_role_idx" ON "ChatMessage"("role");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteSpread_clientId_spreadId_key" ON "FavoriteSpread"("clientId", "spreadId");

-- CreateIndex
CREATE INDEX "Log_createdAt_idx" ON "Log"("createdAt");

-- CreateIndex
CREATE INDEX "Log_level_idx" ON "Log"("level");

-- CreateIndex
CREATE INDEX "Log_clientId_idx" ON "Log"("clientId");

-- CreateIndex
CREATE INDEX "Log_source_idx" ON "Log"("source");

-- CreateIndex
CREATE INDEX "Log_path_idx" ON "Log"("path");

-- CreateIndex
CREATE INDEX "Log_timestamp_idx" ON "Log"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "used_tickets_ticketHash_key" ON "used_tickets"("ticketHash");

-- CreateIndex
CREATE INDEX "used_tickets_expiresAt_idx" ON "used_tickets"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_subscriptions_email_key" ON "email_subscriptions"("email");

-- CreateIndex
CREATE INDEX "email_subscriptions_notifiedAt_idx" ON "email_subscriptions"("notifiedAt");

-- CreateIndex
CREATE INDEX "email_subscriptions_createdAt_idx" ON "email_subscriptions"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyResetHistory" ADD CONSTRAINT "DailyResetHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TarotCard" ADD CONSTRAINT "TarotCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "TarotDeck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardMeaning" ADD CONSTRAINT "CardMeaning_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "TarotCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spread" ADD CONSTRAINT "Spread_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "SpreadLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spread" ADD CONSTRAINT "Spread_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpreadCell" ADD CONSTRAINT "SpreadCell_spreadId_fkey" FOREIGN KEY ("spreadId") REFERENCES "Spread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpreadToCategory" ADD CONSTRAINT "SpreadToCategory_spreadId_fkey" FOREIGN KEY ("spreadId") REFERENCES "Spread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpreadToCategory" ADD CONSTRAINT "SpreadToCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ReadingCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanChangeHistory" ADD CONSTRAINT "PlanChangeHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanChangeHistory" ADD CONSTRAINT "PlanChangeHistory_fromPlanId_fkey" FOREIGN KEY ("fromPlanId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanChangeHistory" ADD CONSTRAINT "PlanChangeHistory_toPlanId_fkey" FOREIGN KEY ("toPlanId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarotist" ADD CONSTRAINT "Tarotist_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_tarotistId_fkey" FOREIGN KEY ("tarotistId") REFERENCES "Tarotist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_spreadId_fkey" FOREIGN KEY ("spreadId") REFERENCES "Spread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reading" ADD CONSTRAINT "Reading_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ReadingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawnCard" ADD CONSTRAINT "DrawnCard_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "Reading"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawnCard" ADD CONSTRAINT "DrawnCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "TarotCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_tarotistId_fkey" FOREIGN KEY ("tarotistId") REFERENCES "Tarotist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "Reading"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteSpread" ADD CONSTRAINT "FavoriteSpread_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteSpread" ADD CONSTRAINT "FavoriteSpread_spreadId_fkey" FOREIGN KEY ("spreadId") REFERENCES "Spread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
