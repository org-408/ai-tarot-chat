"use client";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const APP_SCHEME = "aitarotchat://auth/success";

function Content() {
  const { status } = useSession();
  const router = useRouter();
  const sp = useSearchParams();
  const success = sp.get("success") === "1" || sp.get("success") === "true";
  const retried = useRef(false);
  const [msg, setMsg] = useState("認証中…");

  const deepLinkWithTicket = async () => {
    try {
      setMsg("アプリに戻る準備中…");
      const res = await fetch("/api/native/auth/ticket", { method: "GET" });
      if (!res.ok) throw new Error("ticket-issue-failed");
      const { ticket } = await res.json();
      const url = `${APP_SCHEME}?ticket=${encodeURIComponent(ticket)}`;
      window.location.href = url;
    } catch (e) {
      console.error("チケット取得エラー:", e);
      // 失敗時はサインインに戻す（1回だけ自動）
      if (!retried.current) {
        retried.current = true;
        await signIn(undefined, {
          callbackUrl: "/auth/mobile/callback?isMobile=1",
        });
      } else {
        router.push("/auth/signin?isMobile=true");
      }
    }
  };

  useEffect(() => {
    // 1) 既ログインで /auth/signin → success=1 なら即deep link
    if (success) {
      deepLinkWithTicket();
      return;
    }
    // 2) 認証確定を待つ（Appleは form_post でワンテンポ遅い）
    if (status === "loading") {
      setMsg("認証を確定しています…");
      return;
    }
    // 3) 確定したら ticket 発行 → deep link
    if (status === "authenticated") {
      deepLinkWithTicket();
      return;
    }
    // 4) 未認証なら一度だけ自動サインイン→再入場
    if (status === "unauthenticated" && !retried.current) {
      retried.current = true;
      signIn(undefined, { callbackUrl: "/auth/mobile/callback?isMobile=1" });
      return;
    }
    // 5) それでも未認証：手動でサインイン画面へ
    if (status === "unauthenticated" && retried.current) {
      router.push("/auth/signin?isMobile=true");
    }
  }, [status, success]); // eslint-disable-line

  return (
    <div className="callback-loader">
      <div className="spinner" />
      <p>{msg}</p>
    </div>
  );
}

export default function AuthMobileCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="callback-loader">
          <div className="spinner" />
          <p>読み込み中…</p>
        </div>
      }
    >
      <Content />
    </Suspense>
  );
}
