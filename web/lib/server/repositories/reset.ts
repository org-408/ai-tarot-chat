import { BaseRepository } from "./base";

/**
 * 開発・ステージング環境専用のリセットリポジトリ。
 * FK 制約の順序に従い全テーブルを削除する。
 * 本番環境では絶対に使用しない。
 */
export class ResetRepository extends BaseRepository {
  /** Reading 関連テーブルを FK 順に全削除 */
  async deleteReadingData(): Promise<void> {
    await this.db.chatMessage.deleteMany({});
    await this.db.drawnCard.deleteMany({});
    await this.db.reading.deleteMany({});
  }

  /** Client / Device 関連テーブルを全削除 */
  async deleteClientData(): Promise<void> {
    await this.db.planChangeHistory.deleteMany({});
    await this.db.client.deleteMany({});
    await this.db.device.deleteMany({});
  }

  /** Auth / ログ関連テーブルを全削除 */
  async deleteAuthData(): Promise<void> {
    await this.db.log.deleteMany({});
    await this.db.user.deleteMany({});
    await this.db.session.deleteMany({});
    await this.db.account.deleteMany({});
  }
}

export const resetRepository = new ResetRepository();
