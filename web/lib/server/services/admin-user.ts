import { createHash } from "crypto";
import { logWithContext } from "@/lib/server/logger/logger";
import { adminUserRepository } from "@/lib/server/repositories/admin-user";

export class AdminUserService {
  /** 指定メールアドレスが AdminUser テーブルに存在してアクティブか確認 */
  async isActivated(email: string): Promise<boolean> {
    const adminUser = await adminUserRepository.findByEmail(email);
    return adminUser !== null && adminUser.activatedAt !== null;
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
   * 既存の場合は何もしない。activatedAt は変更しない。
   */
  async registerAdmin(email: string): Promise<void> {
    await adminUserRepository.upsertByEmail(email);
    logWithContext("info", "[AdminUserService] Admin registered/upserted", { email });
  }

  /**
   * 承認待ちの管理者を承認する（管理画面から既存管理者が操作）。
   */
  async activateAdmin(adminUserId: string): Promise<void> {
    const existing = await adminUserRepository.findById(adminUserId);
    if (!existing) {
      throw new Error("指定された管理者が見つかりません");
    }
    await adminUserRepository.activateById(adminUserId);
    logWithContext("info", "[AdminUserService] Admin activated", { adminUserId });
  }

  /**
   * 招待コードを生成して AdminVerificationToken に保存。
   * 返り値は平文の6桁コード（メール送信用）。
   */
  async createInviteCode(email: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15分
    await adminUserRepository.upsertVerificationToken(email, hash, expiresAt);
    logWithContext("info", "[AdminUserService] Invite code created", { email });
    return code;
  }

  /**
   * コードを検証してアクティベート。
   * 成功すれば activatedAt をセットしてトークンを削除。
   */
  async verifyCodeAndActivate(email: string, code: string): Promise<void> {
    const hash = createHash("sha256").update(code).digest("hex");
    const token = await adminUserRepository.verifyAndDeleteToken(email, hash);
    if (!token) {
      throw new Error("コードが無効または期限切れです");
    }
    await adminUserRepository.activate(email);
    logWithContext("info", "[AdminUserService] Admin activated via code", { email });
  }

  /** 有効な招待トークンが存在するか確認 */
  async hasValidInviteToken(email: string): Promise<boolean> {
    const token = await adminUserRepository.findValidVerificationToken(email);
    return token !== null;
  }
}

export const adminUserService = new AdminUserService();
