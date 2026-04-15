"use client";

import { useEffect, useRef } from "react";

/**
 * WebSessionInitializer
 *
 * Web フロントエンド用。初回マウント時に POST /api/auth/web-session を呼び出し、
 * アプリ用 JWT を access_token cookie にセットする。
 *
 * これにより、Web ユーザーが /api/masters や /api/clients/usage を呼ぶ際に
 * verifyApiRequest() が通るようになる。
 */
export function WebSessionInitializer() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    fetch("/api/auth/web-session", {
      method: "POST",
      credentials: "include",
    }).catch((error) => {
      // エラー時はサイレントに失敗（次回のAPIコールで再試行される）
      console.warn("[WebSessionInitializer] Failed to initialize web session:", error);
    });
  }, []);

  return null;
}
