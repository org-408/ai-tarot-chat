"use client";

import { CheckCircle, XCircle } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

interface UserData {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  planType: string;
  isRegistered: boolean;
}

interface SessionData {
  user: UserData;
  expires: string;
  accessToken?: string;
  refreshToken?: string;
}

interface AuthResult {
  success: boolean;
  user: UserData;
  session: SessionData;
}

interface TauriAuthResultProps {
  success: boolean;
  session?: SessionData;
  error?: string;
}

export function TauriAuthResult({
  success,
  session,
  error,
}: TauriAuthResultProps) {
  const [countdown, setCountdown] = useState(3);

  // useCallbackで関数を安定化
  const closeTauriWindow = useCallback((): void => {
    if (typeof window !== "undefined" && window.__TAURI__) {
      window.__TAURI__.window.appWindow.close().catch(console.error);
    } else if (typeof window !== "undefined") {
      window.close();
    }
  }, []);

  const startCountdown = useCallback((): void => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          closeTauriWindow();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [closeTauriWindow]);

  const sendToTauriApp = useCallback((result: AuthResult): void => {
    if (typeof window !== "undefined") {
      const resultJson = JSON.stringify(result);

      localStorage.setItem("tauri-auth-result", resultJson);
      sessionStorage.setItem("tauri-auth-result", resultJson);

      window.dispatchEvent(
        new CustomEvent("tauri-auth-success", {
          detail: result,
        })
      );

      if (window.parent !== window) {
        window.parent.postMessage(result, "*");
      }
    }
  }, []);

  // 依存配列にすべての依存関数を含める
  useEffect(() => {
    if (success && session) {
      const authResult: AuthResult = {
        success: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
          planType: session.user.planType,
          isRegistered: session.user.isRegistered,
        },
        session: session,
      };

      sendToTauriApp(authResult);
      startCountdown();
    }
  }, [success, session, sendToTauriApp, startCountdown]);

  const handleClose = useCallback((): void => {
    closeTauriWindow();
  }, [closeTauriWindow]);

  if (!success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">認証エラー</h1>
          <p className="text-red-500 mb-4">{error || "認証に失敗しました"}</p>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-green-600 mb-2">
          🎉 ログイン完了！
        </h1>
        <p className="text-green-600 mb-4">
          {countdown > 0
            ? `${countdown}秒後にアプリに戻ります`
            : "アプリに戻っています..."}
        </p>

        {session && (
          <div className="bg-white p-4 rounded-lg shadow-sm max-w-md mx-auto">
            <div className="flex items-center space-x-3">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  width={40}
                  height={40}
                  className="rounded-full"
                  priority={false}
                />
              )}
              <div className="text-left">
                <p className="font-medium text-gray-900">{session.user.name}</p>
                <p className="text-sm text-gray-500">{session.user.email}</p>
                <p className="text-xs text-blue-600">
                  {session.user.planType === "FREE_REGISTERED"
                    ? "✨ フリープラン"
                    : session.user.planType}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
