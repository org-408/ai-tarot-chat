import { BaseRepository } from "./base";

export class AdminUserRepository extends BaseRepository {
  async findById(id: string) {
    return this.db.adminUser.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, image: true, activatedAt: true },
    });
  }

  async findByEmail(email: string) {
    return this.db.adminUser.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, image: true, activatedAt: true },
    });
  }

  async upsertByEmail(email: string) {
    return this.db.adminUser.upsert({
      where: { email },
      update: {},
      create: { email },
    });
  }

  async activate(email: string) {
    return this.db.adminUser.update({
      where: { email },
      data: { activatedAt: new Date() },
    });
  }

  async activateById(id: string) {
    return this.db.adminUser.update({
      where: { id },
      data: { activatedAt: new Date() },
    });
  }

  async deleteById(id: string) {
    return this.db.adminUser.delete({ where: { id } });
  }

  /** 招待コードを生成して AdminVerificationToken に保存（既存トークンは上書き） */
  async upsertVerificationToken(email: string, tokenHash: string, expiresAt: Date) {
    await this.db.adminVerificationToken.deleteMany({ where: { identifier: email } });
    return this.db.adminVerificationToken.create({
      data: { identifier: email, token: tokenHash, expires: expiresAt },
    });
  }

  /** 有効なトークンが存在するか確認（期限チェックあり） */
  async findValidVerificationToken(email: string) {
    return this.db.adminVerificationToken.findFirst({
      where: {
        identifier: email,
        expires: { gt: new Date() },
      },
    });
  }

  /** トークンを検証して削除（一致しない or 期限切れなら null） */
  async verifyAndDeleteToken(email: string, tokenHash: string) {
    const token = await this.db.adminVerificationToken.findUnique({
      where: { identifier_token: { identifier: email, token: tokenHash } },
    });
    if (!token || token.expires < new Date()) return null;
    await this.db.adminVerificationToken.delete({
      where: { identifier_token: { identifier: email, token: tokenHash } },
    });
    return token;
  }
}

export const adminUserRepository = new AdminUserRepository();
