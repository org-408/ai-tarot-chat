"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Chrome, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

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

export function SignInForm({ error, isTauri }: SignInFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", {
        callbackUrl: isTauri ? "/auth/tauri-callback" : "/dashboard",
        redirect: true,
      });
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50 text-red-800">
          <AlertDescription>
            {errorMessages[error as keyof typeof errorMessages] ||
              errorMessages.default}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full h-12 bg-white text-gray-900 hover:bg-gray-50 border border-gray-300"
          variant="outline"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              認証中...
            </>
          ) : (
            <>
              <Chrome className="mr-2 h-4 w-4" />
              Googleでログイン
            </>
          )}
        </Button>

        {isTauri && (
          <p className="text-xs text-white/60 text-center">
            モバイルアプリからのアクセスです
          </p>
        )}

        <p className="text-xs text-white/60 text-center">
          ログインすることで、
          <a href="/terms" className="text-white hover:underline">
            利用規約
          </a>
          および
          <a href="/privacy" className="text-white hover:underline">
            プライバシーポリシー
          </a>
          に同意したものとみなされます。
        </p>
      </div>
    </>
  );
}
