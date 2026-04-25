"use client";

import { useClientStore } from "@/lib/client/stores/client-store";
import { useEffect } from "react";

const POLL_INTERVAL_MS = 60_000;

export function UsagePoller() {
  const refreshUsage = useClientStore((s) => s.refreshUsage);
  const isSessionExpired = useClientStore((s) => s.isSessionExpired);

  useEffect(() => {
    // セッション切れ検知時はポーリングを止める。
    // 既存タブが NextAuth maxAge 超過や AUTH_SECRET 変更で 401 を吐き続ける
    // のを防ぎ、サーバログのノイズと無駄なトラフィックを抑える。
    // 復帰はユーザーが SessionExpiredBanner から再サインインした時。
    if (isSessionExpired) return;

    // 初回マウント時に即取得しないと usage=null のまま sidebar が GUEST 表示を続けてしまう
    refreshUsage();
    const id = setInterval(refreshUsage, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshUsage();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshUsage, isSessionExpired]);

  return null;
}
