"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Monitor, Shield, Smartphone } from "lucide-react";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

interface SignInFormProps {
  error?: string;
  isTauri?: boolean;
}

const errorMessages = {
  Signin: "サインインに失敗しました。もう一度お試しください。",
  OAuthSignin: "OAuth認証に失敗しました。",
  OAuthCallback: "OAuth認証の処理中にエラーが発生しました。",
  OAuthCreateAccount: "アカウントの作成に失敗しました。",
  EmailCreateAccount: "メールアカウントの作成に失敗しました。",
  Callback: "認証コールバックの処理中にエラーが発生しました。",
  OAuthAccountNotLinked: "別の方法で既に登録されたメールアドレスです。",
  EmailSignin: "メールの送信に失敗しました。",
  CredentialsSignin: "認証情報が正しくありません。",
  default: "認証中にエラーが発生しました。",
};

// デバイス判定
const useDeviceDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = window.navigator.userAgent;
      const mobile =
        /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent
        );
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return { isMobile };
};

// Google Sign-In 公式ボタン
const GoogleSignInButton = ({
  isLoading,
  onClick,
  isMobile,
}: {
  isLoading: boolean;
  onClick: () => void;
  isMobile: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className={`
      w-full h-12 bg-white hover:bg-gray-50 disabled:bg-gray-100 
      border border-gray-300 rounded-lg flex items-center justify-center gap-3 
      transition-all duration-200 shadow-sm hover:shadow-md 
      disabled:shadow-none disabled:cursor-not-allowed
      focus:outline-none focus:ring-2 focus:ring-blue-500/20
      ${isMobile ? "active:scale-95" : "active:scale-[0.98]"}
      ${isLoading ? "signin-loading" : ""}
    `}
    aria-label="Googleでサインイン"
  >
    {isLoading ? (
      <>
        <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
        <span className="text-gray-600 font-medium">認証中...</span>
      </>
    ) : (
      <>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span className="text-gray-700 font-medium">Googleでサインイン</span>
      </>
    )}
  </button>
);

// Apple Sign-In 公式ボタン
const AppleSignInButton = ({
  isLoading,
  onClick,
  isMobile,
}: {
  isLoading: boolean;
  onClick: () => void;
  isMobile: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className={`
      w-full h-12 bg-black hover:bg-gray-800 disabled:bg-gray-700 text-white 
      rounded-lg flex items-center justify-center gap-3 transition-all duration-200 
      shadow-sm hover:shadow-md disabled:shadow-none disabled:cursor-not-allowed
      focus:outline-none focus:ring-2 focus:ring-gray-400/20
      ${isMobile ? "active:scale-95" : "active:scale-[0.98]"}
      ${isLoading ? "signin-loading" : ""}
    `}
    aria-label="Appleでサインイン"
  >
    {isLoading ? (
      <>
        <Loader2 className="h-5 w-5 animate-spin text-white" />
        <span className="text-white font-medium">認証中...</span>
      </>
    ) : (
      <>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        <span className="text-white font-medium">Appleでサインイン</span>
      </>
    )}
  </button>
);

// プラットフォーム情報表示
const PlatformInfo = ({
  isTauri,
  isMobile,
}: {
  isTauri: boolean;
  isMobile: boolean;
}) => {
  if (!isTauri && !isMobile) return null;

  return (
    <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
      {isTauri ? (
        <>
          <Smartphone className="h-4 w-4" />
          <span>モバイルアプリ版</span>
        </>
      ) : isMobile ? (
        <>
          <Smartphone className="h-4 w-4" />
          <span>モバイル版</span>
        </>
      ) : (
        <>
          <Monitor className="h-4 w-4" />
          <span>デスクトップ版</span>
        </>
      )}
    </div>
  );
};

export function SignInForm({ error, isTauri }: SignInFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const { isMobile } = useDeviceDetection();

  const handleSignIn = async (provider: string) => {
    if (isLoading) return;

    setIsLoading(true);
    setActiveProvider(provider);

    try {
      await signIn(provider, {
        callbackUrl: isTauri ? "/auth/tauri-callback" : "/dashboard",
        redirect: true,
      });
    } catch (error) {
      console.error("Sign in error:", error);
      // エラー時のみリセット
      setIsLoading(false);
      setActiveProvider(null);
    }
  };

  return (
    <>
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50/90 backdrop-blur-sm">
          <Shield className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {errorMessages[error as keyof typeof errorMessages] ||
              errorMessages.default}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <GoogleSignInButton
          isLoading={isLoading && activeProvider === "google"}
          onClick={() => handleSignIn("google")}
          isMobile={isMobile}
        />

        <AppleSignInButton
          isLoading={isLoading && activeProvider === "apple"}
          onClick={() => handleSignIn("apple")}
          isMobile={isMobile}
        />
      </div>

      {/* セキュリティ表示 */}
      <div className="mt-6 flex items-center justify-center gap-6 text-white/50 text-sm">
        <div className="flex items-center gap-2">
          <Shield className="w-3 h-3 text-green-400" />
          <span>安全な認証</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
          <span>データ保護</span>
        </div>
      </div>

      {/* フッター情報 */}
      <div className="mt-8 space-y-3 text-center">
        <PlatformInfo isTauri={!!isTauri} isMobile={isMobile} />

        <p className="text-xs text-white/60 leading-relaxed">
          サインインすることで、
          <a
            href="/terms"
            className="text-sky-300 hover:text-sky-200 underline underline-offset-2 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            利用規約
          </a>
          および
          <a
            href="/privacy"
            className="text-sky-300 hover:text-sky-200 underline underline-offset-2 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            プライバシーポリシー
          </a>
          に同意したものとみなされます。
        </p>
      </div>
    </>
  );
}
