"use client";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

const APP_SCHEME = "aitarotchat://auth/success";

function Content() {
  const { status } = useSession();
  const router = useRouter();
  const sp = useSearchParams();

  // パスが /auth/mobile/callback なので当然モバイル
  // success=true は既ログインショートカット用
  const success = sp.get("success") === "true";

  const retried = useRef(false);
  const [msg, setMsg] = useState("認証中…");

  const deepLinkWithTicket = useCallback(async () => {
    try {
      setMsg("アプリに戻る準備中…");
      const res = await fetch("/api/auth/ticket", { method: "GET" });
      if (!res.ok) throw new Error("ticket-issue-failed");
      const { ticket } = await res.json();
      const url = `${APP_SCHEME}?ticket=${encodeURIComponent(ticket)}`;
      window.location.href = url;
    } catch (e) {
      console.error("error", "チケット取得エラー:", e);
      if (!retried.current) {
        retried.current = true;
        await signIn(undefined, {
          callbackUrl: "/auth/mobile/callback",
        });
      } else {
        router.push("/auth/signin?isMobile=true");
      }
    }
  }, [router]);

  useEffect(() => {
    console.log("info", "AuthMobileCallbackPage status:", { status, success });

    // OAuth 認証の確定を待つ（success=true でも必ず待つ）
    if (status === "loading") {
      setMsg(success ? "セッション確立中…" : "認証を確定しています…");
      console.log("info", "セッション確立中… : 認証を確定しています…", {
        status,
        success,
      });
      return;
    }

    // 認証確定後、ticket 発行 → deep link
    if (status === "authenticated") {
      deepLinkWithTicket();
      console.log("info", "認証確定 → チケット発行 → アプリに戻る", {
        status,
        success,
      });
      return;
    }

    // 未認証の場合、1回だけ自動サインイン
    if (status === "unauthenticated" && !retried.current) {
      retried.current = true;
      signIn(undefined, {
        callbackUrl: "/auth/mobile/callback",
      });
      console.log("info", "未認証 → 自動サインイン試行", { status, success });
      return;
    }

    // それでも未認証の場合は手動サインイン画面へ
    if (status === "unauthenticated" && retried.current) {
      console.log("info", "未認証 → 手動サインイン画面へリダイレクト", {
        status,
        success,
      });
      router.push("/auth/signin?isMobile=true");
    }
  }, [status, success, router, deepLinkWithTicket]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-purple-800 to-pink-800 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-6"></div>
        <p className="text-white text-xl font-medium">{msg}</p>
      </div>
    </div>
  );
}

export default function AuthMobileCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-purple-800 to-pink-800 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-6"></div>
            <p className="text-white text-xl font-medium">読み込み中…</p>
          </div>
        </div>
      }
    >
      <Content />
    </Suspense>
  );
}
