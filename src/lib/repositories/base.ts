import Database from "@tauri-apps/plugin-sql";
import { DatabaseRepository } from "./database";

/**
 * 共通CRUD処理を提供する基底クラス
 */
export abstract class BaseRepository {
  protected get db(): Database {
    return DatabaseRepository.getDB();
  }

  // ユーティリティメソッド
  protected toTimestamp(date: Date): number {
    return Math.floor(date.getTime() / 1000);
  }

  protected fromTimestamp(timestamp: number): Date {
    return new Date(timestamp * 1000);
  }

  protected parseJSON<T>(json: string): T {
    return JSON.parse(json);
  }

  protected stringifyJSON<T>(data: T): string {
    return JSON.stringify(data);
  }

  protected boolToInt(value: boolean): number {
    return value ? 1 : 0;
  }

  protected intToBool(value: number): boolean {
    return value === 1;
  }

  protected nullableTimestamp(date?: Date | null): number | null {
    return date ? this.toTimestamp(date) : null;
  }

  protected nullableDate(timestamp?: number | null): Date | null {
    return timestamp ? this.fromTimestamp(timestamp) : null;
  }
}
