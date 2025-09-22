import type { UserInput } from "@/../shared/lib/types";
import { prisma } from "@/prisma/prisma";

// -------- Google認証用の型定義 --------

export interface GoogleUserData {
  email: string;
  name: string;
  image?: string | null; // null も許可
  sub: string; // Google User ID
}

// -------- Google認証関連のユーザー操作 --------

// Google認証後の自動ユーザー作成/更新
export async function createOrUpdateUserFromGoogle(googleData: GoogleUserData) {
  try {
    // Google IDとEmailの両方でユーザーを検索
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: googleData.email }, { googleId: googleData.sub }],
      },
    });

    if (existingUser) {
      // 既存ユーザーの情報を更新
      const user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: googleData.name, // 最新の名前に更新
          image: googleData.image, // 最新のプロフィール画像に更新
          googleId: googleData.sub, // Google IDが未設定の場合は設定
          isRegistered: true,
          // 最終ログイン時刻更新
          lastLoginAt: new Date(),
          // フリープランから登録済みプランにアップグレード
          planType:
            existingUser.planType === "FREE_UNREGISTERED"
              ? "FREE_REGISTERED"
              : existingUser.planType,
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        googleId: user.googleId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        planType: user.planType,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate,
        dailyReadingsCount: user.dailyReadingsCount,
        lastReadingDate: user.lastReadingDate,
        dailyAiChatCount: user.dailyAiChatCount,
        lastAiChatDate: user.lastAiChatDate,
        deviceId: user.deviceId,
        isRegistered: user.isRegistered,
        lastLoginAt: user.lastLoginAt,
      };
    } else {
      // 新規ユーザー作成
      const user = await prisma.user.create({
        data: {
          email: googleData.email,
          name: googleData.name,
          image: googleData.image,
          googleId: googleData.sub,
          isRegistered: true,
          planType: "FREE_REGISTERED", // 初回登録は登録済みフリープラン
          dailyReadingsCount: 0,
          dailyAiChatCount: 0,
          lastLoginAt: new Date(),
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        googleId: user.googleId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        planType: user.planType,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionStartDate: user.subscriptionStartDate,
        subscriptionEndDate: user.subscriptionEndDate,
        dailyReadingsCount: user.dailyReadingsCount,
        lastReadingDate: user.lastReadingDate,
        dailyAiChatCount: user.dailyAiChatCount,
        lastAiChatDate: user.lastAiChatDate,
        deviceId: user.deviceId,
        isRegistered: user.isRegistered,
        lastLoginAt: user.lastLoginAt,
      };
    }
  } catch (error) {
    console.error("Google認証でのユーザー作成/更新に失敗:", error);
    throw new Error("ユーザー作成に失敗しました");
  }
}

// Google IDでユーザーを取得
export async function getUserByGoogleId(googleId: string) {
  const user = await prisma.user.findUnique({
    where: { googleId },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    googleId: user.googleId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    planType: user.planType,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStartDate: user.subscriptionStartDate,
    subscriptionEndDate: user.subscriptionEndDate,
    dailyReadingsCount: user.dailyReadingsCount,
    lastReadingDate: user.lastReadingDate,
    dailyAiChatCount: user.dailyAiChatCount,
    lastAiChatDate: user.lastAiChatDate,
    deviceId: user.deviceId,
    isRegistered: user.isRegistered,
    lastLoginAt: user.lastLoginAt,
  };
}

// -------- 既存のUser操作（そのまま維持） --------

// ユーザー一覧の取得
export async function getUsers() {
  const users = await prisma.user.findMany();

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    googleId: user.googleId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    planType: user.planType,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStartDate: user.subscriptionStartDate,
    subscriptionEndDate: user.subscriptionEndDate,
    dailyReadingsCount: user.dailyReadingsCount,
    lastReadingDate: user.lastReadingDate,
    dailyAiChatCount: user.dailyAiChatCount,
    lastAiChatDate: user.lastAiChatDate,
    deviceId: user.deviceId,
    isRegistered: user.isRegistered,
    lastLoginAt: user.lastLoginAt,
  }));
}

// ユーザーをIDで取得
export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    googleId: user.googleId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    planType: user.planType,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStartDate: user.subscriptionStartDate,
    subscriptionEndDate: user.subscriptionEndDate,
    dailyReadingsCount: user.dailyReadingsCount,
    lastReadingDate: user.lastReadingDate,
    dailyAiChatCount: user.dailyAiChatCount,
    lastAiChatDate: user.lastAiChatDate,
    deviceId: user.deviceId,
    isRegistered: user.isRegistered,
    lastLoginAt: user.lastLoginAt,
  };
}

// ユーザーをメールアドレスで取得
export async function getUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    googleId: user.googleId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    planType: user.planType,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStartDate: user.subscriptionStartDate,
    subscriptionEndDate: user.subscriptionEndDate,
    dailyReadingsCount: user.dailyReadingsCount,
    lastReadingDate: user.lastReadingDate,
    dailyAiChatCount: user.dailyAiChatCount,
    lastAiChatDate: user.lastAiChatDate,
    deviceId: user.deviceId,
    isRegistered: user.isRegistered,
    lastLoginAt: user.lastLoginAt,
  };
}

// ユーザーをデバイスIDで取得
export async function getUserByDeviceId(deviceId: string) {
  const user = await prisma.user.findUnique({
    where: { deviceId },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    googleId: user.googleId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    planType: user.planType,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStartDate: user.subscriptionStartDate,
    subscriptionEndDate: user.subscriptionEndDate,
    dailyReadingsCount: user.dailyReadingsCount,
    lastReadingDate: user.lastReadingDate,
    dailyAiChatCount: user.dailyAiChatCount,
    lastAiChatDate: user.lastAiChatDate,
    deviceId: user.deviceId,
    isRegistered: user.isRegistered,
    lastLoginAt: user.lastLoginAt,
  };
}

// 新規ユーザーの作成
export async function createUser(userData: UserInput) {
  const user = await prisma.user.create({
    data: {
      email: userData.email,
      planType: userData.planType,
      subscriptionStatus: userData.subscriptionStatus,
      subscriptionStartDate: userData.subscriptionStartDate,
      subscriptionEndDate: userData.subscriptionEndDate,
      dailyReadingsCount: userData.dailyReadingsCount,
      lastReadingDate: userData.lastReadingDate,
      dailyAiChatCount: userData.dailyAiChatCount,
      lastAiChatDate: userData.lastAiChatDate,
      deviceId: userData.deviceId,
      isRegistered: userData.isRegistered,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    googleId: user.googleId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    planType: user.planType,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStartDate: user.subscriptionStartDate,
    subscriptionEndDate: user.subscriptionEndDate,
    dailyReadingsCount: user.dailyReadingsCount,
    lastReadingDate: user.lastReadingDate,
    dailyAiChatCount: user.dailyAiChatCount,
    lastAiChatDate: user.lastAiChatDate,
    deviceId: user.deviceId,
    isRegistered: user.isRegistered,
    lastLoginAt: user.lastLoginAt,
  };
}

// デバイスIDから匿名ユーザー作成（初回アクセス時）
export async function createAnonymousUser(deviceId: string) {
  const user = await prisma.user.create({
    data: {
      email: `anonymous-${deviceId}@example.com`, // 一時的なメールアドレス
      planType: "FREE_UNREGISTERED",
      deviceId,
      isRegistered: false,
      dailyReadingsCount: 0,
      dailyAiChatCount: 0,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    googleId: user.googleId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    planType: user.planType,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStartDate: user.subscriptionStartDate,
    subscriptionEndDate: user.subscriptionEndDate,
    dailyReadingsCount: user.dailyReadingsCount,
    lastReadingDate: user.lastReadingDate,
    dailyAiChatCount: user.dailyAiChatCount,
    lastAiChatDate: user.lastAiChatDate,
    deviceId: user.deviceId,
    isRegistered: user.isRegistered,
    lastLoginAt: user.lastLoginAt,
  };
}

// ユーザー情報の更新
export async function updateUserById(id: string, userData: Partial<UserInput>) {
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) throw new Error("ユーザーが見つかりません");

  const user = await prisma.user.update({
    where: { id },
    data: userData,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    googleId: user.googleId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    planType: user.planType,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStartDate: user.subscriptionStartDate,
    subscriptionEndDate: user.subscriptionEndDate,
    dailyReadingsCount: user.dailyReadingsCount,
    lastReadingDate: user.lastReadingDate,
    dailyAiChatCount: user.dailyAiChatCount,
    lastAiChatDate: user.lastAiChatDate,
    deviceId: user.deviceId,
    isRegistered: user.isRegistered,
    lastLoginAt: user.lastLoginAt,
  };
}

// 匿名ユーザーから登録ユーザーへアップグレード
export async function upgradeToRegisteredUser(id: string, email: string) {
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) throw new Error("ユーザーが見つかりません");
  if (existingUser.isRegistered) throw new Error("既に登録済みのユーザーです");

  const user = await prisma.user.update({
    where: { id },
    data: {
      email,
      planType: "FREE_REGISTERED",
      isRegistered: true,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    googleId: user.googleId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    planType: user.planType,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStartDate: user.subscriptionStartDate,
    subscriptionEndDate: user.subscriptionEndDate,
    dailyReadingsCount: user.dailyReadingsCount,
    lastReadingDate: user.lastReadingDate,
    dailyAiChatCount: user.dailyAiChatCount,
    lastAiChatDate: user.lastAiChatDate,
    deviceId: user.deviceId,
    isRegistered: user.isRegistered,
    lastLoginAt: user.lastLoginAt,
  };
}

// プラン変更
export async function updateUserPlan(
  id: string,
  planType: "FREE_REGISTERED" | "STANDARD" | "PREMIUM",
  subscriptionStatus: "ACTIVE" | "INACTIVE" | "CANCELED" | "EXPIRED",
  subscriptionEndDate?: Date
) {
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) throw new Error("ユーザーが見つかりません");
  if (!existingUser.isRegistered)
    throw new Error("登録ユーザーのみプラン変更が可能です");

  const user = await prisma.user.update({
    where: { id },
    data: {
      planType,
      subscriptionStatus,
      subscriptionStartDate: new Date(),
      subscriptionEndDate,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    googleId: user.googleId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    planType: user.planType,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionStartDate: user.subscriptionStartDate,
    subscriptionEndDate: user.subscriptionEndDate,
    dailyReadingsCount: user.dailyReadingsCount,
    lastReadingDate: user.lastReadingDate,
    dailyAiChatCount: user.dailyAiChatCount,
    lastAiChatDate: user.lastAiChatDate,
    deviceId: user.deviceId,
    isRegistered: user.isRegistered,
    lastLoginAt: user.lastLoginAt,
  };
}

// ユーザー削除
export async function deleteUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) throw new Error("ユーザーが見つかりません");

  await prisma.user.delete({
    where: { id },
  });

  return { success: true };
}

// 利用回数の更新 (リーディング)
export async function incrementReadingCount(id: string) {
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) throw new Error("ユーザーが見つかりません");

  // 日付を確認し、前回のリーディングが昨日以前なら、カウンターをリセット
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastReadingDate = existingUser.lastReadingDate;
  const shouldResetCount =
    !lastReadingDate || new Date(lastReadingDate) < today;

  const user = await prisma.user.update({
    where: { id },
    data: {
      dailyReadingsCount: shouldResetCount ? 1 : { increment: 1 },
      lastReadingDate: new Date(),
    },
  });

  return {
    id: user.id,
    dailyReadingsCount: user.dailyReadingsCount,
    lastReadingDate: user.lastReadingDate,
  };
}

// 利用回数の更新 (AIチャット)
export async function incrementAiChatCount(id: string) {
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) throw new Error("ユーザーが見つかりません");

  // 日付を確認し、前回のAIチャットが昨日以前なら、カウンターをリセット
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastAiChatDate = existingUser.lastAiChatDate;
  const shouldResetCount = !lastAiChatDate || new Date(lastAiChatDate) < today;

  const user = await prisma.user.update({
    where: { id },
    data: {
      dailyAiChatCount: shouldResetCount ? 1 : { increment: 1 },
      lastAiChatDate: new Date(),
    },
  });

  return {
    id: user.id,
    dailyAiChatCount: user.dailyAiChatCount,
    lastAiChatDate: user.lastAiChatDate,
  };
}

// 利用制限のチェック (リーディング)
export async function checkReadingLimit(id: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) throw new Error("ユーザーが見つかりません");

  // 日付を確認し、前回のリーディングが昨日以前なら、問題なく利用可能
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastReadingDate = user.lastReadingDate;
  if (!lastReadingDate || new Date(lastReadingDate) < today) {
    return true; // 今日初めての利用なので制限なし
  }

  // プランごとの制限を適用
  switch (user.planType) {
    case "FREE_UNREGISTERED":
      return user.dailyReadingsCount < 1; // 未登録ユーザーは1日1回まで
    case "FREE_REGISTERED":
      return user.dailyReadingsCount < 3; // 登録済みフリーユーザーは1日3回まで
    case "STANDARD":
      return user.dailyReadingsCount < 10; // スタンダードプランは1日10回まで
    case "PREMIUM":
      return true; // プレミアムプランは無制限
    default:
      return false;
  }
}

// 利用制限のチェック (AIチャット)
export async function checkAiChatLimit(id: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) throw new Error("ユーザーが見つかりません");

  // 日付を確認し、前回のAIチャットが昨日以前なら、問題なく利用可能
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastAiChatDate = user.lastAiChatDate;
  if (!lastAiChatDate || new Date(lastAiChatDate) < today) {
    return true; // 今日初めての利用なので制限なし
  }

  // プランごとの制限を適用
  switch (user.planType) {
    case "FREE_UNREGISTERED":
      return user.dailyAiChatCount < 1; // 未登録ユーザーは1日1回まで
    case "FREE_REGISTERED":
      return user.dailyAiChatCount < 5; // 登録済みフリーユーザーは1日5回まで
    case "STANDARD":
      return user.dailyAiChatCount < 20; // スタンダードプランは1日20回まで
    case "PREMIUM":
      return true; // プレミアムプランは無制限
    default:
      return false;
  }
}
