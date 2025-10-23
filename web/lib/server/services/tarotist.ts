import type {
  Tarotist,
  TarotistInput,
  TarotistWithPlanCode,
} from "@/../shared/lib/types";
import { tarotistRepository } from "@/lib/server/repositories";

export class TarotistService {
  /**
   * デフォルトのタロット占い師情報を取得
   */
  async getDefaultTarotist(): Promise<Tarotist | null> {
    return await tarotistRepository.getDefaultTarotist();
  }

  /**
   * タロット占い師リストを取得
   * @param soft - ソフトデリート対応（削除されていないもののみ取得）
   */
  async getAllTarotists(soft: boolean = true): Promise<Tarotist[]> {
    return await tarotistRepository.getAllTarotists(soft);
  }

  /**
   * IDでタロット占い師を取得
   * @param id - タロット占い師ID
   * @param soft - ソフトデリート対応（削除されていないもののみ取得）
   */
  async getTarotistById(
    id: string,
    soft: boolean = true
  ): Promise<Tarotist | null> {
    return await tarotistRepository.getTarotistById(id, soft);
  }

  /**
   * タロット占い師情報を作成
   */
  async createTarotist(data: TarotistInput): Promise<Tarotist> {
    return await tarotistRepository.createTarotist(data);
  }

  async createTarotistWithPlanCode(
    data: TarotistWithPlanCode
  ): Promise<Tarotist> {
    return await tarotistRepository.createTarotistWithPlanCode(data);
  }

  /**
   * タロット占い師情報を更新
   * @param id - タロット占い師ID
   * @param data - 更新データ
   * @param soft - ソフトデリート対応（削除されていないもののみ更新）
   */
  async updateTarotist(
    id: string,
    data: TarotistInput,
    soft: boolean = true
  ): Promise<Tarotist> {
    return await tarotistRepository.updateTarotist(id, data, soft);
  }

  /**
   * タロット占い師情報を削除
   * @param id - タロット占い師ID
   * @param soft - true: ソフトデリート（論理削除）, false: ハードデリート（物理削除）
   */
  async deleteTarotist(id: string, soft: boolean = true): Promise<Tarotist> {
    return await tarotistRepository.deleteTarotist(id, soft);
  }
}

export const tarotistService = new TarotistService();
