import { Preferences } from "@capacitor/preferences";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";
import { queryClient } from "../services/queryClient";
import { useAuthStore } from "../stores/auth";
import { useLifecycleStore } from "../stores/lifecycle";
import { apiClient } from "./apiClient";

/**
 * アプリの全ストアとキャッシュをリセットする
 * - 認証ストアをリセット
 * - ライフサイクルストアをリセット
 * - React Queryのキャッシュをクリア
 * - Capacitor Preferencesをクリア
 * - APIクライアントのトークンキャッシュをクリア
 */
export const resetAppData = async () => {
  try {
    logWithContext("info", "[ResetApp] App data reset started");

    // 1. Zustandストアをリセット
    useAuthStore.getState().reset();
    useLifecycleStore.getState().reset();

    // 2. React Queryのキャッシュをクリア
    queryClient.clear();

    // 3. APIクライアントのトークンキャッシュをクリア
    if (apiClient.clearTokenCache) {
      apiClient.clearTokenCache();
    }

    // 4. 重要なストレージキーを個別に削除
    await storeRepository.delete("accessToken");
    await storeRepository.delete("deviceId");
    await storeRepository.delete("clientId");
    await storeRepository.delete("userId");
    await storeRepository.delete("auth-storage");
    await storeRepository.delete("lifecycle-storage");

    // 5. すべてのPreferencesをクリア
    await Preferences.clear();

    logWithContext("info", "[ResetApp] App data reset completed successfully");
    return true;
  } catch (error) {
    logWithContext("error", "[ResetApp] App data reset failed:", { error });
    throw error;
  }
};
