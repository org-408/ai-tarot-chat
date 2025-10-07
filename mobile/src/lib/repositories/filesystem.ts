import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";

/**
 * Capacitor Filesystem を使った大容量データ永続化
 * MasterData や React Query Cache などに使用
 */
class FilesystemRepository {
  private readonly directory = Directory.Data;
  private readonly MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB制限

  /**
   * データを保存
   */
  async set<T>(key: string, data: T): Promise<void> {
    try {
      const jsonString = JSON.stringify(data);
      const sizeInBytes = new Blob([jsonString]).size;

      // サイズチェック
      if (sizeInBytes > this.MAX_SIZE_BYTES) {
        console.warn(
          `[Filesystem] Data too large to save (${(
            sizeInBytes /
            1024 /
            1024
          ).toFixed(2)}MB): ${key}`
        );
        return; // 保存しない（エラーにしない）
      }

      await Filesystem.writeFile({
        path: `${key}.json`,
        data: jsonString,
        directory: this.directory,
        encoding: Encoding.UTF8, // 明示的にUTF8を指定
      });

      console.log(
        `[Filesystem] Saved: ${key} (${(sizeInBytes / 1024).toFixed(2)}KB)`
      );
    } catch (error) {
      console.error(`[Filesystem] Failed to save ${key}:`, error);
      // エラーを投げない（アプリを止めない）
    }
  }

  /**
   * データを取得
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const { data } = await Filesystem.readFile({
        path: `${key}.json`,
        directory: this.directory,
        encoding: Encoding.UTF8, // 明示的にUTF8を指定
      });
      console.log(`[Filesystem] Loaded: ${key}`);
      return JSON.parse(data as string);
    } catch (error) {
      // ファイルが存在しない場合はnullを返す
      console.warn(`[Filesystem] Failed to load ${key}:`, error);
      return null;
    }
  }

  /**
   * データを削除
   */
  async delete(key: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: `${key}.json`,
        directory: this.directory,
      });
      console.log(`[Filesystem] Deleted: ${key}`);
    } catch (error) {
      console.warn(`[Filesystem] Failed to delete ${key}:`, error);
    }
  }

  /**
   * すべてのファイルをクリア（デバッグ用）
   */
  async clear(): Promise<void> {
    try {
      const { files } = await Filesystem.readdir({
        path: "",
        directory: this.directory,
      });

      for (const file of files) {
        if (file.name.endsWith(".json")) {
          await this.delete(file.name.replace(".json", ""));
        }
      }
      console.log("[Filesystem] Cleared all data");
    } catch (error) {
      console.error("[Filesystem] Failed to clear:", error);
    }
  }
}

export const filesystemRepository = new FilesystemRepository();
