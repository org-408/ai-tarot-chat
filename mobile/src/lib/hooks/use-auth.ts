import { useAuthStore } from "../stores/auth";

/**
 * 認証フック
 *
 * 純粋に認証に関する情報のみ
 * Client情報は useClient() を使う
 */
export function useAuth() {
  const {
    isReady,
    payload,
    isAuthenticated,
    init,
    login,
    logout,
    refresh,
    setPayload,
    reset,
  } = useAuthStore();

  return {
    // 認証の状態
    isReady,
    isAuthenticated,

    // トークン情報（主にデバッグ用）
    payload,
    deviceId: payload?.deviceId || null,

    // 認証のアクション
    init,
    login,
    logout,
    refresh,
    setPayload,
    reset,
  };
}
