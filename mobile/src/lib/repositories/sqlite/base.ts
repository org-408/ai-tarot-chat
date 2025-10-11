import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { getDB } from "./database";

/**
 * トランザクション用の型定義
 * PrismaTransactionの代替としてSQLiteDBConnectionを使用
 */
export type DBTransaction = SQLiteDBConnection;

/**
 * Repository基底クラス (SQLite版)
 *
 * 全てのリポジトリクラスの基底となるクラス。
 * データアクセスの共通機能、トランザクション管理、および便利なユーティリティメソッドを提供。
 */
export abstract class BaseRepository {
  // トランザクションコンテキスト（オプション）
  private txContext?: DBTransaction;

  /**
   * データベースコンテキストを取得
   * 通常のSQLiteDBConnectionまたはトランザクションコンテキストを返す
   */
  protected async getDb(): Promise<SQLiteDBConnection> {
    // トランザクションコンテキストがあればそれを使う
    if (this.txContext) {
      return this.txContext;
    }
    return await getDB();
  }

  /**
   * トランザクションコンテキスト付きのRepositoryインスタンスを返す
   * @param tx SQLiteトランザクションオブジェクト
   * @returns トランザクションコンテキストが設定された新しいRepositoryインスタンス
   */
  withTransaction(tx: DBTransaction): this {
    const instance = Object.create(Object.getPrototypeOf(this));
    Object.assign(instance, this);
    instance.txContext = tx;
    return instance;
  }

  /**
   * JSON文字列をオブジェクトに変換
   * @param json 変換するJSON文字列
   * @returns パースされたオブジェクト、エラー時や空の入力は空オブジェクト
   */
  protected parseJSON<T>(json: string | null | undefined): T {
    if (!json) return {} as T;
    try {
      return JSON.parse(json) as T;
    } catch (e) {
      console.error("JSON parse error:", e);
      return {} as T;
    }
  }

  /**
   * オブジェクトをJSON文字列に変換
   * @param data 変換するオブジェクト
   * @returns JSON文字列
   */
  protected stringifyJSON<T>(data: T): string {
    return JSON.stringify(data);
  }

  /**
   * PrismaのEnum型を文字列に変換
   * @param value 変換するEnum値
   * @returns 文字列に変換された値
   */
  protected enumToString<T extends string | number>(value: T): string {
    return String(value);
  }

  /**
   * 文字列からPrismaのEnum型に変換
   * @param value 変換する文字列
   * @param enumType Enumのオブジェクト (例: Prisma.RoleEnum)
   * @param defaultValue 変換に失敗した場合のデフォルト値
   * @returns Enum値、不正な値の場合はデフォルト値
   */
  protected stringToEnum<T extends Record<string, string>>(
    value: string | null | undefined,
    enumType: T,
    defaultValue: keyof T
  ): keyof T {
    if (!value) return defaultValue;

    // 文字列がenum値として存在するか確認
    const enumValues = Object.values(enumType);
    if (enumValues.includes(value)) {
      return value as keyof T;
    }

    return defaultValue;
  }

  /**
   * Nullableな値を安全に文字列に変換
   * @param value 変換する値
   * @returns 文字列、またはnull
   */
  protected safeToString(
    value: string | number | boolean | null | undefined
  ): string | null {
    if (value === null || value === undefined) return null;
    return String(value);
  }

  /**
   * トランザクション実行
   * @param callback トランザクション内で実行するコールバック関数
   * @param timeout タイムアウト時間（ミリ秒）デフォルト3分
   * @returns コールバック関数の戻り値
   */
  protected async transaction<T>(
    callback: (tx: DBTransaction) => Promise<T>,
    timeout: number = 3 * 60 * 1000 // デフォルト3分, ミリ秒単位
  ): Promise<T> {
    const db = await getDB();

    try {
      // トランザクション開始
      await db.execute("BEGIN TRANSACTION");

      // タイムアウト処理付きでコールバック実行
      const result = await Promise.race([
        callback(db),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error("Transaction timeout")), timeout)
        ),
      ]);

      // コミット
      await db.execute("COMMIT");

      return result;
    } catch (error) {
      // エラー時はロールバック
      try {
        await db.execute("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
      throw error;
    }
  }

  /**
   * 複数のリポジトリを使用するトランザクションを実行
   * サービス層から呼び出して使用する静的メソッド
   *
   * @param repositories トランザクションで使用するリポジトリのマップ
   * @param callback トランザクション内で実行するコールバック関数
   * @param timeout タイムアウト時間（ミリ秒）デフォルト3分
   * @returns コールバック関数の戻り値
   *
   * @example
   * // 使用例
   * return BaseRepository.transaction(
   *   { client: clientRepository, auth: authRepository },
   *   async ({ client, auth }) => {
   *     const device = await client.getDeviceByDeviceId(params.deviceId);
   *     // ... その他のトランザクション処理 ...
   *     return result;
   *   }
   * );
   */
  static async transaction<T, R extends Record<string, BaseRepository>>(
    repositories: R,
    callback: (repos: { [K in keyof R]: R[K] }) => Promise<T>,
    timeout: number = 3 * 60 * 1000 // デフォルト3分, ミリ秒単位
  ): Promise<T> {
    const db = await getDB();

    try {
      // トランザクション開始
      await db.execute("BEGIN TRANSACTION");

      // 各リポジトリにトランザクションコンテキストを適用
      const txRepos = {} as { [K in keyof R]: R[K] };

      for (const [key, repo] of Object.entries(repositories)) {
        txRepos[key as keyof R] = repo.withTransaction(db) as R[keyof R];
      }

      // タイムアウト処理付きでトランザクション内でコールバックを実行
      const result = await Promise.race([
        callback(txRepos),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error("Transaction timeout")), timeout)
        ),
      ]);

      // コミット
      await db.execute("COMMIT");

      return result;
    } catch (error) {
      // エラー時はロールバック
      try {
        await db.execute("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
      throw error;
    }
  }
}
