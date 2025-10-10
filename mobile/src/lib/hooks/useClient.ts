import { useAuthStore } from "../stores/auth";

/**
 * Client（ユーザー）情報のフック
 *
 * Auth から Client に関する情報だけを抽出
 * - Client基本情報
 * - Plan情報
 * - User情報
 * - Plan変更
 */
export function useClient() {
  const { payload, changePlan } = useAuthStore();

  return {
    // Client の基本情報
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

    // Client のアクション
    changePlan,
  };
}
