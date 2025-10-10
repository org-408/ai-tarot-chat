import { Preferences } from "@capacitor/preferences";
import { logWithContext } from "../logger/logger";
import { filesystemRepository } from "../repositories/filesystem";
import { storeRepository } from "../repositories/store";
import { queryClient } from "../services/queryClient";
import { useAuthStore } from "../stores/auth";
import { useLifecycleStore } from "../stores/lifecycle";
import { apiClient } from "./apiClient";

/**
 * アプリの全ストアとキャッシュをリセットする
 *
 * リセット対象：
 * - 認証ストア（Zustand）
 * - ライフサイクルストア（Zustand）
 * - React Queryのキャッシュ（Master/Usage）
 * - マスターデータのファイルシステムキャッシュ
 * - Capacitor Preferences（全体）
 * - APIクライアントのトークンキャッシュ
 */
export const resetAppData = async () => {
  try {
    logWithContext("info", "[ResetApp] App data reset started");

    const deviceId = await storeRepository.get("deviceId");
    logWithContext("info", "[ResetApp] Current deviceId", { deviceId });

    // ========================================
    // 1. Zustandストアをリセット
    // ========================================
    logWithContext("info", "[ResetApp] Resetting Zustand stores");
    useAuthStore.getState().reset();
    useLifecycleStore.getState().reset();

    // ========================================
    // 2. React Queryのキャッシュをクリア
    // ========================================
    logWithContext("info", "[ResetApp] Clearing React Query cache");
    queryClient.clear();

    // ========================================
    // 3. APIクライアントのトークンキャッシュをクリア
    // ========================================
    logWithContext("info", "[ResetApp] Clearing API client token cache");
    if (apiClient.clearTokenCache) {
      apiClient.clearTokenCache();
    }

    // ========================================
    // 4. マスターデータのファイルシステムキャッシュをクリア
    // ========================================
    logWithContext("info", "[ResetApp] Clearing master data filesystem cache");
    try {
      await filesystemRepository.delete("master_data");
    } catch (error) {
      // ファイルが存在しない場合はエラーを無視
      logWithContext("warn", "[ResetApp] Master data file not found", {
        error,
      });
    }

    // ========================================
    // 5. Preference内の個別キーを削除
    // ========================================
    logWithContext("info", "[ResetApp] Deleting individual storage keys");

    // 認証関連
    await storeRepository.delete("accessToken");
    await storeRepository.delete("deviceId");
    await storeRepository.delete("clientId");
    await storeRepository.delete("userId");

    // Zustand永続化キー
    await storeRepository.delete("auth-storage");
    await storeRepository.delete("lifecycle-storage");

    // マスターデータバージョン
    await storeRepository.delete("master_data_version");

    // 旧Usage関連（削除予定の古いキー）
    await storeRepository.delete("usage-storage");
    await storeRepository.delete("usage_last_fetched_date");

    // ========================================
    // 6. すべてのPreferencesをクリア（念のため）
    // ========================================
    logWithContext("info", "[ResetApp] Clearing all Capacitor Preferences");
    await Preferences.clear();

    // ========================================
    // 7. Webサーバー側のデータを削除
    // ========================================
    if (deviceId) {
      logWithContext("info", "[ResetApp] Deleting server-side data", {
        deviceId,
      });
      try {
        await apiClient.post("/api/device/reset", { deviceId });
        logWithContext("info", "[ResetApp] Server-side data deleted");
      } catch (error) {
        logWithContext(
          "error",
          "[ResetApp] Failed to delete server-side data",
          {
            error,
          }
        );
      }
    } else {
      logWithContext(
        "warn",
        "[ResetApp] No deviceId found, skipping server reset"
      );
    }

    logWithContext("info", "[ResetApp] App data reset completed successfully");
    return true;
  } catch (error) {
    logWithContext("error", "[ResetApp] App data reset failed", { error });
    throw error;
  }
};

/**
 * 開発用：マスターデータのみをクリアする
 * 認証情報は保持したまま、マスターデータだけ再取得したい場合に使用
 */
export const resetMasterDataOnly = async () => {
  try {
    logWithContext("info", "[ResetApp] Master data reset started");

    // マスターデータのキャッシュをクリア
    await filesystemRepository.delete("master_data");
    await storeRepository.delete("master_data_version");

    // React Queryのマスターデータキャッシュをクリア
    queryClient.removeQueries({ queryKey: ["masters"] });

    logWithContext("info", "[ResetApp] Master data reset completed");
    return true;
  } catch (error) {
    logWithContext("error", "[ResetApp] Master data reset failed", { error });
    throw error;
  }
};

/**
 * 開発用：Usageデータのみをクリアする
 * 認証情報は保持したまま、Usageだけリセットしたい場合に使用
 */
export const resetUsageOnly = async () => {
  try {
    logWithContext("info", "[ResetApp] Usage reset started");

    // React QueryのUsageキャッシュをクリア
    queryClient.removeQueries({ queryKey: ["usage"] });

    // 旧Usage関連キーを削除
    await storeRepository.delete("usage_last_fetched_date");

    logWithContext("info", "[ResetApp] Usage reset completed");
    return true;
  } catch (error) {
    logWithContext("error", "[ResetApp] Usage reset failed", { error });
    throw error;
  }
};
