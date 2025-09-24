"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import Image from "next/image";
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

  const handleSignIn = async (provider: string) => {
    setIsLoading(true);
    try {
      // await signIn("google", {
      //   callbackUrl: isTauri ? "/auth/tauri-callback" : "/dashboard",
      //   redirect: true,
      // });
      await signIn(provider);
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
          onClick={() => handleSignIn("google")}
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
              <Image
                src="/images/ios_light_sq_SU@2x.png"
                alt="Google ID"
                width={200}
                height={30}
              />
            </>
          )}
        </Button>
        <Button
          onClick={() => handleSignIn("apple")}
          className="w-full h-12 bg-white text-gray-900 hover:bg-gray-50 border border-gray-300"
          variant="ghost"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              認証中...
            </>
          ) : (
            <>
              <Image
                src="/images/appleid_button@2x.png"
                alt="Apple ID"
                width={200}
                height={30}
              />
            </>
          )}
        </Button>
      </div>
      <div className="mt-6 space-y-2">
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
