"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect } from "react";
import {
  configureRC,
  purchasePlan,
  getManagementURL,
  PurchasesError,
  ErrorCode,
} from "../purchases";

export function useRevenuecat() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // mobile と同じ user.id で RC を初期化（ユーザーが変わっても追従）
  useEffect(() => {
    if (userId) configureRC(userId);
  }, [userId]);

  const purchase = useCallback(
    async (planCode: "STANDARD" | "PREMIUM") => {
      const { customerInfo } = await purchasePlan(planCode);

      // 購入完了後にサーバーへ即時反映（RC webhook のバックアップとして）
      const res = await fetch("/api/clients/plan/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: planCode }),
      });
      if (!res.ok) throw new Error("Plan sync failed");

      return customerInfo;
    },
    []
  );

  const openManagement = useCallback(async () => {
    const url = await getManagementURL();
    if (!url) {
      // URL が取れないケース（管理URLが未発行・クロスストア等）は呼び出し元で
      // フォールバック（/plans 遷移など）できるよう例外を投げる。
      throw new Error("management URL unavailable");
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const isUserCancelled = (e: unknown): boolean =>
    e instanceof PurchasesError && e.errorCode === ErrorCode.UserCancelledError;

  return { purchase, openManagement, isUserCancelled };
}
