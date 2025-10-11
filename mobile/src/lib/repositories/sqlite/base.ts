/**
 * SQLite Repository Base Class
 * 
 * Prisma版のBaseRepositoryをSQLite用に移植
 */

import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { getDatabase } from '../../database/sqlite';

/**
 * Repository基底クラス（SQLite版）
 */
export abstract class BaseRepository {
  // データベース接続を取得
  protected async getDb(): Promise<SQLiteDBConnection> {
    return await getDatabase();
  }

  /**
   * トランザクション実行
   */
  protected async transaction<T>(
    callback: (db: SQLiteDBConnection) => Promise<T>
  ): Promise<T> {
    const db = await this.getDb();
    
    try {
      await db.execute('BEGIN TRANSACTION');
      const result = await callback(db);
      await db.execute('COMMIT');
      return result;
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  }

  // ユーティリティメソッド
  protected parseJSON<T>(json: string): T {
    return JSON.parse(json);
  }

  protected stringifyJSON<T>(data: T): string {
    return JSON.stringify(data);
  }

  // SQLite用: boolean を integer に変換
  protected boolToInt(value: boolean): number {
    return value ? 1 : 0;
  }

  // SQLite用: integer を boolean に変換
  protected intToBool(value: number): boolean {
    return value === 1;
  }

  // SQLite用: Date を ISO文字列に変換
  protected dateToString(date: Date): string {
    return date.toISOString();
  }

  // SQLite用: ISO文字列 を Date に変換
  protected stringToDate(str: string): Date {
    return new Date(str);
  }
}
