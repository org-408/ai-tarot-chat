"use client";

import { useClientStore } from "@/lib/client/stores/client-store";
import { useEffect } from "react";

const POLL_INTERVAL_MS = 60_000;

export function UsagePoller() {
  const refreshUsage = useClientStore((s) => s.refreshUsage);

  useEffect(() => {
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
  }, [refreshUsage]);

  return null;
}
