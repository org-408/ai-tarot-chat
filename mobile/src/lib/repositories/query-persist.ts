import { Capacitor } from "@capacitor/core";
import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";
import { filesystemRepository } from "./filesystem";

const STORAGE_KEY = "react-query-cache";

/**
 * Web用Persister（IndexedDB）
 * - 大容量対応（数MB〜数十MB）
 * - 非同期処理でUIブロックなし
 */
function createWebPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await set(STORAGE_KEY, client);
        console.log("[Persister:Web] Query cache persisted");
      } catch (error) {
        console.error("[Persister:Web] Failed to persist query cache:", error);
      }
    },

    restoreClient: async (): Promise<PersistedClient | undefined> => {
      try {
        const cached = await get<PersistedClient>(STORAGE_KEY);
        if (cached) {
          console.log("[Persister:Web] Query cache restored");
        }
        return cached;
      } catch (error) {
        console.error("[Persister:Web] Failed to restore query cache:", error);
        return undefined;
      }
    },

    removeClient: async () => {
      try {
        await del(STORAGE_KEY);
        console.log("[Persister:Web] Query cache removed");
      } catch (error) {
        console.error("[Persister:Web] Failed to remove query cache:", error);
      }
    },
  };
}

/**
 * Native用Persister（Filesystem）
 * - iOS/Android の内部ストレージ
 * - 自動暗号化（OS標準）
 */
function createNativePersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await filesystemRepository.set(STORAGE_KEY, client);
        console.log("[Persister:Native] Query cache persisted");
      } catch (error) {
        console.error(
          "[Persister:Native] Failed to persist query cache:",
          error
        );
      }
    },

    restoreClient: async (): Promise<PersistedClient | undefined> => {
      try {
        const cached = await filesystemRepository.get<PersistedClient>(
          STORAGE_KEY
        );
        if (cached) {
          console.log("[Persister:Native] Query cache restored");
        }
        return cached || undefined;
      } catch (error) {
        console.error(
          "[Persister:Native] Failed to restore query cache:",
          error
        );
        return undefined;
      }
    },

    removeClient: async () => {
      try {
        await filesystemRepository.delete(STORAGE_KEY);
        console.log("[Persister:Native] Query cache removed");
      } catch (error) {
        console.error(
          "[Persister:Native] Failed to remove query cache:",
          error
        );
      }
    },
  };
}

/**
 * プラットフォームに応じたPersisterを作成
 */
export function createQueryPersister(): Persister {
  const isNative = Capacitor.isNativePlatform();
  console.log(`[Persister] Creating ${isNative ? "Native" : "Web"} persister`);

  return isNative ? createNativePersister() : createWebPersister();
}
