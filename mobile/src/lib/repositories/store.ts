import { Preferences } from '@capacitor/preferences';

export class StoreRepository {
  async init() {
    // Capacitor Preferencesは初期化不要
    // 互換性のために空メソッドを提供
    console.log('Store initialized (Capacitor Preferences)');
  }

  async get<T>(key: string): Promise<T | null> {
    const { value } = await Preferences.get({ key });
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await Preferences.set({
      key,
      value: JSON.stringify(value)
    });
  }

  async delete(key: string): Promise<void> {
    await Preferences.remove({ key });
  }

  async has(key: string): Promise<boolean> {
    const { value } = await Preferences.get({ key });
    return value !== null;
  }

  async clear(): Promise<void> {
    await Preferences.clear();
  }

  // Tauri版にあるメソッドも追加
  async getMany<T>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = await this.get<T>(key);
    }
    return result;
  }

  async setMany(entries: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      await this.set(key, value);
    }
  }
}

export const storeRepository = new StoreRepository();