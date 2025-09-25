import { Store } from "@tauri-apps/plugin-store";

/**
 * Tauri Store への低レベルアクセスを抽象化
 * Tauri 2.8: Store はデフォルトで自動保存（.save()不要）
 */
export class StoreRepository {
  private store: Store | null = null;
  private readonly STORE_FILE = "app.json";

  async init() {
    // Tauri 2.8: load() は非推奨、new Store() で自動初期化
    this.store = await Store.load(this.STORE_FILE);
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.store) throw new Error("Store not initialized");
    const value = await this.store.get<T>(key);
    return value === undefined ? null : value;
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.store) throw new Error("Store not initialized");
    await this.store.set(key, value);
    // Tauri 2.8: 自動保存されるが、明示的に保存も可能
    await this.store.save();
  }

  async delete(key: string): Promise<void> {
    if (!this.store) throw new Error("Store not initialized");
    await this.store.delete(key);
    await this.store.save();
  }

  async has(key: string): Promise<boolean> {
    if (!this.store) throw new Error("Store not initialized");
    return await this.store.has(key);
  }

  async clear(): Promise<void> {
    if (!this.store) throw new Error("Store not initialized");
    await this.store.clear();
    await this.store.save();
  }

  // バッチ操作
  async getMany<T>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = await this.get<T>(key);
    }
    return result;
  }

  async setMany(entries: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      await this.store!.set(key, value);
    }
    await this.store!.save();
  }
}

// シングルトンインスタンス
export const storeRepository = new StoreRepository();
