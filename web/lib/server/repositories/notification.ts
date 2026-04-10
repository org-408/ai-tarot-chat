import { randomBytes } from "crypto";
import { prisma } from "./database";

export function generateUnsubscribeToken(): string {
  return randomBytes(32).toString("hex");
}

// ==========================================
// EmailSubscription
// ==========================================

export async function findSubscriptionByEmail(email: string) {
  return prisma.emailSubscription.findUnique({ where: { email } });
}

export async function upsertSubscription(email: string, platform: string) {
  const existing = await findSubscriptionByEmail(email);
  if (existing) {
    return prisma.emailSubscription.update({
      where: { email },
      data: { platform, unsubscribedAt: null },
    });
  }
  return prisma.emailSubscription.create({
    data: { email, platform, unsubscribeToken: generateUnsubscribeToken() },
  });
}

export async function findSubscriptionByToken(token: string) {
  return prisma.emailSubscription.findUnique({
    where: { unsubscribeToken: token },
  });
}

export async function unsubscribeByToken(token: string) {
  return prisma.emailSubscription.update({
    where: { unsubscribeToken: token },
    data: { unsubscribedAt: new Date() },
  });
}

export async function listActiveSubscriptions() {
  return prisma.emailSubscription.findMany({
    where: { unsubscribedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

export async function listAllSubscriptions() {
  return prisma.emailSubscription.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function ensureUnsubscribeToken(id: string) {
  return prisma.emailSubscription.update({
    where: { id },
    data: { unsubscribeToken: generateUnsubscribeToken() },
  });
}

// ==========================================
// NotificationBatch
// ==========================================

export async function createBatch(data: {
  title: string;
  body: string;
  platform: string;
}) {
  return prisma.notificationBatch.create({ data });
}

export async function listBatches() {
  return prisma.notificationBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { sents: true } },
    },
  });
}

export async function findBatch(id: string) {
  return prisma.notificationBatch.findUnique({
    where: { id },
    include: { _count: { select: { sents: true } } },
  });
}

export async function updateBatch(
  id: string,
  data: { sentAt?: Date; totalSent?: number; totalFailed?: number }
) {
  return prisma.notificationBatch.update({ where: { id }, data });
}

// ==========================================
// NotificationSent
// ==========================================

export async function createSentRecord(data: {
  batchId: string;
  subscriptionId: string;
  email: string;
  status: "success" | "failed";
  error?: string;
}) {
  return prisma.notificationSent.create({ data });
}

export async function listSentForBatch(batchId: string) {
  return prisma.notificationSent.findMany({
    where: { batchId },
    orderBy: { sentAt: "asc" },
  });
}

export async function listUnsentSubscriptionsForBatch(
  batchId: string,
  platform: string
) {
  return prisma.emailSubscription.findMany({
    where: {
      unsubscribedAt: null,
      ...(platform !== "all"
        ? { OR: [{ platform }, { platform: "both" }] }
        : {}),
      sents: { none: { batchId } },
    },
    orderBy: { createdAt: "asc" },
  });
}
