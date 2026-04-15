import { logWithContext } from "@/lib/server/logger/logger";
import { adminUserRepository } from "@/lib/server/repositories/admin-user";

export class AdminUserService {
  /** 指定メールアドレスが AdminUser テーブルに登録されているか確認 */
  async isRegistered(email: string): Promise<boolean> {
    const adminUser = await adminUserRepository.findByEmail(email);
    return adminUser !== null;
  }

  /**
   * 管理者を削除する。
   * 自分自身の削除は許可しない。
   */
  async removeAdmin(adminUserId: string, currentAdminId: string): Promise<void> {
    if (adminUserId === currentAdminId) {
      throw new Error("自分自身の管理者権限は削除できません");
    }
    const existing = await adminUserRepository.findById(adminUserId);
    if (!existing) {
      throw new Error("指定された管理者が見つかりません");
    }
    await adminUserRepository.deleteById(adminUserId);
    logWithContext("info", "[AdminUserService] Admin removed", { adminUserId });
  }

  /**
   * 管理者を招待する（AdminUser に upsert）。
   * 既存の場合は何もしない。
   */
  async registerAdmin(email: string): Promise<void> {
    await adminUserRepository.upsertByEmail(email);
    logWithContext("info", "[AdminUserService] Admin registered/upserted", { email });
  }
}

export const adminUserService = new AdminUserService();
