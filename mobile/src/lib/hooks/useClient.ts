import { useAuthStore } from "../stores/auth";
import { useClientStore } from "../stores/client";

/**
 * Client（ユーザー）情報のフック
 *
 * Auth から Client 情報を取得 + Client Store のアクションを提供
 *
 * ⚠️ プラン変更は useLifecycle().changePlan() を使用すること
 */
export function useClient() {
  const { payload } = useAuthStore();
  const {
    isReady,
    currentPlan,
    usage,
    init,
    refreshUsage,
    checkAndResetIfNeeded,
    decrementOptimistic,
  } = useClientStore();

  return {
    // ============================================
    // Client の基本情報（Auth から取得）
    // ============================================
    clientId: payload?.clientId || null,
    planCode: payload?.planCode || "GUEST",
    isRegistered: !!payload?.user,

    // User 情報
    user: payload?.user || null,
    userId: payload?.user?.id || null,
    email: payload?.user?.email || null,
    name: payload?.user?.name || null,
    image: payload?.user?.image || null,
    provider: payload?.provider || null,

    // ============================================
    // 利用状況（Client Store から取得）
    // ============================================
    isReady,
    currentPlan,
    usage,
    remainingReadings: usage?.remainingReadings ?? 0,
    remainingCeltics: usage?.remainingCeltics ?? 0,
    remainingPersonal: usage?.remainingPersonal ?? 0,

    // ============================================
    // アクション
    // ============================================
    init,
    refreshUsage,
    checkAndResetIfNeeded,
    decrementOptimistic,

    // ⚠️ プラン変更は useLifecycle().changePlan() を使用
  };
}
