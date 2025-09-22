import type { User } from "@/../shared/lib/types";
import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/prisma/prisma";

// ==========================================
// 基本的なユーザー取得・作成・更新
// ==========================================

// ユーザーをIDで取得（関連データを含む）
export async function getUserById(
  id: string,
  take: number = 10
): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { id },
    include: {
      plan: true,
      accounts: true,
      readingHistories: {
        take,
        orderBy: { createdAt: "desc" },
        include: { spread: true, category: true },
      },
      favoriteSpreads: {
        include: {
          spread: true,
        },
      },
    },
  });
}

// ユーザーをメールアドレスで取得
export async function getUserByEmail(email: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { email },
    include: { plan: true, accounts: true },
  });
}

// ユーザーをデバイスIDで取得（ゲストユーザー用）
export async function getUserByDeviceId(
  deviceId: string
): Promise<User | null> {
  const device = await prisma.device.findUnique({
    where: { deviceId },
    include: { user: { include: { plan: true } } },
  });
  return device?.user ?? null;
}

export async function updateUserById(
  id: string,
  user: Prisma.UserUpdateInput,
  take: number = 10
) {
  return await prisma.user.update({
    where: { id },
    data: user,
    include: {
      plan: true,
      accounts: true,
      readingHistories: {
        take,
        orderBy: { createdAt: "desc" },
        include: { spread: true, category: true },
      },
      favoriteSpreads: {
        include: {
          spread: true,
        },
      },
    },
  });
}

export async function createUser(user: Prisma.UserCreateInput) {
  return await prisma.user.create({
    data: user,
    include: { plan: true, accounts: true },
  });
}

export async function deleteUserById(id: string, soft: boolean = true) {
  if (soft) {
    // ソフトデリート
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  } else {
    // 完全削除
    await prisma.user.delete({ where: { id } });
  }
}

// ==========================================
// ゲストユーザー関連
// ==========================================

// ゲストユーザーを作成（初回アクセス時）
export async function createGuestUser(params: {
  deviceId: string;
  platform?: string | null;
  appVersion?: string | null;
  osVersion?: string | null;
}): Promise<User> {
  const { deviceId, platform, appVersion, osVersion } = params;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.device.findUnique({
      where: { deviceId },
      include: { user: true },
    });
    if (existing?.user) {
      return existing.user;
    }

    const guestPlan = await tx.plan.findUnique({
      where: { code: "GUEST" }, // ここは運用のゲストプランコードに合わせて
    });
    if (!guestPlan) {
      throw new Error("ゲストプランが見つかりません。");
    }

    // ユーザーとデバイスを同時に作成
    const user = await tx.user.create({
      data: {
        planId: guestPlan.id,
        isRegistered: false,
        devices: {
          create: {
            deviceId,
            platform,
            appVersion,
            osVersion,
            lastSeenAt: new Date(),
          },
        },
      },
      include: { plan: true, devices: true },
    });

    return user;
  });
}

// ==========================================
// 認証関連（シンプル版）
// ==========================================

// ゲストユーザーを登録ユーザーに移行
type MigrateGuestParams = {
  deviceId: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

function isSameDay(a: Date | null | undefined, b: Date | null | undefined) {
  if (!a || !b) return false;
  const A = new Date(a),
    B = new Date(b);
  return (
    A.getFullYear() === B.getFullYear() &&
    A.getMonth() === B.getMonth() &&
    A.getDate() === B.getDate()
  );
}

export async function migrateGuestUser({
  deviceId,
  email,
  name,
  image,
}: MigrateGuestParams) {
  return await prisma.$transaction(async (tx) => {
    const include = {
      plan: true,
      devices: true,
      favoriteSpreads: true,
      readingHistories: true,
    };

    const guest = await tx.user.findFirst({
      where: {
        devices: { some: { deviceId } },
        // ゲスト判定：email未設定のユーザーをゲストとみなす
        email: null,
      },
      include,
    });

    const existing = await tx.user.findUnique({
      where: { email },
      include,
    });

    const freePlan = await tx.plan.findUnique({
      where: { code: "FREE" }, // ここは運用のデフォルトプランコードに合わせて
    });
    if (!freePlan) {
      throw new Error("フリープランが見つかりません。");
    }

    // 1) guestあり & existingなし → 昇格（UPDATE）
    if (guest && !existing) {
      const updated = await tx.user.update({
        where: { id: guest.id },
        data: {
          email,
          name: name ?? guest.name,
          image: image ?? guest.image,
          emailVerified: new Date(),
          planId: freePlan.id,
          isRegistered: true,
        },
        include,
      });
      // device は既に紐づいている想定
      return updated;
    }

    // 2) guestあり & existingあり → マージ（移管＋guest削除 or ソフトデリート）
    if (guest && existing) {
      // 履歴・お気に入り・デバイスの移管
      await tx.readingHistory.updateMany({
        where: { userId: guest.id },
        data: { userId: existing.id },
      });
      await tx.favoriteSpread.updateMany({
        where: { userId: guest.id },
        data: { userId: existing.id },
      });
      await tx.device.updateMany({
        where: { userId: guest.id },
        data: { userId: existing.id },
      });

      // 日次カウンタ統合（方針：同日なら max、別日なら既存を優先）
      const merged = await tx.user.update({
        where: { id: existing.id },
        data: {
          dailyReadingsCount: isSameDay(
            existing.lastReadingDate,
            guest.lastReadingDate
          )
            ? Math.max(
                existing.dailyReadingsCount ?? 0,
                guest.dailyReadingsCount ?? 0
              )
            : existing.dailyReadingsCount ?? 0,
          dailyCelticsCount: isSameDay(
            existing.lastCelticReadingDate,
            guest.lastCelticReadingDate
          )
            ? Math.max(
                existing.dailyCelticsCount ?? 0,
                guest.dailyCelticsCount ?? 0
              )
            : existing.dailyCelticsCount ?? 0,
          dailyPersonalCount: isSameDay(
            existing.lastPersonalReadingDate,
            guest.lastPersonalReadingDate
          )
            ? Math.max(
                existing.dailyPersonalCount ?? 0,
                guest.dailyPersonalCount ?? 0
              )
            : existing.dailyPersonalCount ?? 0,
        },
        include,
      });

      // ゲストを削除（運用でソフトデリートにしたいなら deletedAt を設定）
      await tx.user.delete({ where: { id: guest.id } });

      return merged;
    }

    // 3) guestなし & existingあり → device を既存に紐付け
    if (!guest && existing) {
      await tx.device.upsert({
        where: { deviceId }, // deviceId に UNIQUE 制約を前提
        update: { userId: existing.id },
        create: { deviceId, userId: existing.id },
      });
      return existing;
    }

    // 4) 両方なし → 新規作成（初期プラン付与・device 紐付け）
    const created = await tx.user.create({
      data: {
        email,
        name: name ?? null,
        image: image ?? null,
        emailVerified: new Date(),
        planId: freePlan.id,
        devices: { create: { deviceId } },
      },
      include,
    });

    return created;
  });
}

// ==========================================
// 利用状況管理
// ==========================================

// 利用回数を更新
export async function updateUsageCount(
  userId: string,
  type: "reading" | "celtic" | "personal",
  increment: number = 1
): Promise<{ count: number; date: Date }> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // anyを避けて具体的な型を定義
  type UpdateData = {
    dailyReadingsCount?: number;
    lastReadingDate?: Date;
    dailyCelticsCount?: number;
    lastCelticReadingDate?: Date;
    dailyPersonalCount?: number;
    lastPersonalReadingDate?: Date;
  };

  let updateData: UpdateData = {};
  let newCount = increment;

  switch (type) {
    case "reading":
      if (user.lastReadingDate && new Date(user.lastReadingDate) >= today) {
        newCount = user.dailyReadingsCount + increment;
      }
      updateData = {
        dailyReadingsCount: newCount,
        lastReadingDate: now,
      };
      break;

    case "celtic":
      if (
        user.lastCelticReadingDate &&
        new Date(user.lastCelticReadingDate) >= today
      ) {
        newCount = user.dailyCelticsCount + increment;
      }
      updateData = {
        dailyCelticsCount: newCount,
        lastCelticReadingDate: now,
      };
      break;

    case "personal":
      if (
        user.lastPersonalReadingDate &&
        new Date(user.lastPersonalReadingDate) >= today
      ) {
        newCount = user.dailyPersonalCount + increment;
      }
      updateData = {
        dailyPersonalCount: newCount,
        lastPersonalReadingDate: now,
      };
      break;
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return { count: newCount, date: now };
}

// 利用制限をチェック
export async function checkUsageLimit(
  userId: string,
  type: "reading" | "celtic" | "personal"
): Promise<{ canUse: boolean; remaining: number; limit: number }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { plan: true },
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let currentCount = 0;
  let lastDate: Date | null = null;
  let limit = 0;

  // 制限値を取得
  const limits = {
    GUEST: { reading: 30, celtic: 0, personal: 0 },
    FREE: { reading: 90, celtic: 0, personal: 0 },
    STANDARD: { reading: 90, celtic: 30, personal: 0 },
    PREMIUM: { reading: -1, celtic: -1, personal: 30 }, // -1は無制限
  };

  const planLimits =
    limits[user.plan?.code as keyof typeof limits] || limits.GUEST;

  switch (type) {
    case "reading":
      currentCount = user.dailyReadingsCount;
      lastDate = user.lastReadingDate;
      limit = user.plan?.maxReadings ?? planLimits.reading;
      break;
    case "celtic":
      currentCount = user.dailyCelticsCount;
      lastDate = user.lastCelticReadingDate;
      limit = user.plan?.maxCeltics ?? planLimits.celtic;
      break;
    case "personal":
      currentCount = user.dailyPersonalCount;
      lastDate = user.lastPersonalReadingDate;
      limit = user.plan?.maxPersonal ?? planLimits.personal;
      break;
  }

  // 日付が変わっていればリセット
  if (!lastDate || new Date(lastDate) < today) {
    currentCount = 0;
  }

  const canUse = limit === -1 || currentCount < limit;
  const remaining = limit === -1 ? -1 : Math.max(0, limit - currentCount);

  return { canUse, remaining, limit };
}

// ==========================================
// プラン関連
// ==========================================

// プランを変更
export async function changeUserPlan(
  userId: string,
  planCode: string
): Promise<User> {
  const plan = await prisma.plan.findUniqueOrThrow({
    where: { code: planCode },
  });

  return await prisma.$transaction(async (tx) => {
    // プラン変更履歴を記録
    await tx.planChangeHistory.create({
      data: { userId, planId: plan.id },
    });

    // ユーザーのプランを更新
    return await tx.user.update({
      where: { id: userId },
      data: { planId: plan.id },
      include: { plan: true },
    });
  });
}

// ==========================================
// デバイス関連
// ==========================================

// 端末登録/更新（ログイン時などで冪等に紐づけ）
export async function upsertDeviceForUser(params: {
  userId: string;
  deviceId: string;
  platform?: string | null;
  appVersion?: string | null;
  osVersion?: string | null;
  pushToken?: string | null;
}) {
  const { userId, deviceId, ...meta } = params;
  return prisma.device.upsert({
    where: { deviceId },
    update: { userId, lastSeenAt: new Date(), ...meta },
    create: { userId, deviceId, ...meta },
  });
}

// 心拍（起動/復帰時）
export async function heartbeatDevice(
  deviceId: string,
  meta?: {
    appVersion?: string | null;
    osVersion?: string | null;
    pushToken?: string | null;
  }
) {
  return prisma.device.update({
    where: { deviceId },
    data: { lastSeenAt: new Date(), ...meta },
  });
}

export async function updateDevicePushToken(
  deviceId: string,
  pushToken: string
) {
  return prisma.device.update({
    where: { deviceId },
    data: { pushToken, lastSeenAt: new Date() },
  });
}

export async function listUserDevices(userId: string) {
  return prisma.device.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
  });
}

export async function unlinkDevice(deviceId: string) {
  return prisma.device.delete({ where: { deviceId } });
}

// マージ（guest → existing）
export async function transferDevices(fromUserId: string, toUserId: string) {
  await prisma.device.updateMany({
    where: { userId: fromUserId },
    data: { userId: toUserId },
  });
}

// ==========================================
// ユーティリティ
// ==========================================

// 最終ログイン時刻を更新
export async function updateLastLoginAt(id: string): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { lastLoginAt: new Date() },
  });
}

// ユーザーを削除
export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}
