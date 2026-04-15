/**
 * 既存 User テーブルの role=ADMIN を AdminUser へ移行するスクリプト
 *
 * 使い方:
 *   npm run migrate:admin-users
 *
 * 動作:
 *   1. User テーブルから role=ADMIN のレコードを全件取得
 *   2. 各ユーザーを AdminUser テーブルに upsert（email でユニーク判定）
 *   3. 移行済みの件数をログ出力
 *
 * 注意:
 *   - 既存 User テーブルのデータは削除しない（後方互換のため残す）
 *   - AccountやSession は移行しない（管理者は新たにサインインし直す必要がある）
 *   - 実行後は AdminUser テーブルにログインできることを確認すること
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Admin ユーザー移行スクリプト開始...");

  // role=ADMIN のユーザーを全件取得
  const adminUsers = await prisma.user.findMany({
    where: { role: "ADMIN" },
  });

  console.log(`📋 移行対象: ${adminUsers.length} 件の管理者ユーザーが見つかりました`);

  if (adminUsers.length === 0) {
    console.log("✅ 移行対象のユーザーがいないため、処理を終了します。");
    return;
  }

  let migratedCount = 0;
  let skippedCount = 0;

  for (const user of adminUsers) {
    if (!user.email) {
      console.warn(`⚠️  スキップ: email が未設定のユーザー (id: ${user.id})`);
      skippedCount++;
      continue;
    }

    try {
      await prisma.adminUser.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
        },
        create: {
          name: user.name,
          email: user.email,
          image: user.image,
          emailVerified: user.emailVerified,
        },
      });

      console.log(`✅ 移行完了: ${user.email} (元 User id: ${user.id})`);
      migratedCount++;
    } catch (error) {
      console.error(`❌ 移行失敗: ${user.email}`, error);
    }
  }

  console.log("\n📊 移行結果:");
  console.log(`  - 移行完了: ${migratedCount} 件`);
  console.log(`  - スキップ: ${skippedCount} 件`);
  console.log("\n⚠️  注意: 移行されたユーザーは /admin/auth/signin から再度サインインが必要です。");
  console.log("   （OAuth Account/Session は移行されないため）");
}

main()
  .catch((error) => {
    console.error("❌ スクリプト実行エラー:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
