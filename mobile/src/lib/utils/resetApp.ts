import { Preferences } from "@capacitor/preferences";
import { logWithContext } from "../logger/logger";
import { filesystemRepository } from "../repositories/filesystem";
import { storeRepository } from "../repositories/store";
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
    // 3. マスターデータのファイルシステムキャッシュをクリア
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
    // 4. Preference内の個別キーを削除
    // ========================================
    logWithContext("info", "[ResetApp] Deleting individual storage keys");

    // 認証関連
    await storeRepository.delete("accessToken");
    await storeRepository.delete("deviceId");
    await storeRepository.delete("clientId");
    await storeRepository.delete("userId");

    // Zustand永続化キー
    await storeRepository.delete("lifecycle-storage");
    await storeRepository.delete("auth-storage");
    await storeRepository.delete("client-storage");
    await storeRepository.delete("subscription-storage");
    await storeRepository.delete("master-storage");

    // ========================================
    // 6. すべてのPreferencesをクリア（念のため）
    // ========================================
    logWithContext("info", "[ResetApp] Clearing all Capacitor Preferences");
    await Preferences.clear();

    // ========================================
    // 7. Webサーバー側のデータを削除
    // ========================================
    logWithContext("info", "[ResetApp] Deleting server-side data");
    const secret = import.meta.env.VITE_AUTH_SECRET;
    try {
      await apiClient.postWithoutAuth<{ success: boolean }>("/api/reset", {
        secret,
      });
      logWithContext(
        "info",
        "[ResetApp] Server-side data(clients/devices/logs) deleted"
      );
    } catch (error) {
      logWithContext("error", "[ResetApp] Failed to delete server-side data", {
        error,
      });
    }
    logWithContext("info", "[ResetApp] App data reset completed successfully");
    return true;
  } catch (error) {
    logWithContext("error", "[ResetApp] App data reset failed", { error });
    throw error;
  }
};
