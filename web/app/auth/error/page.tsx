"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const provider = searchParams.get("provider");

  const renderAppleResetGuide = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">
          🍎 Apple認証の初回設定が必要です
        </h3>
        <p className="text-blue-700 text-sm">
          Apple認証でメールアドレスが取得できませんでした。
          <br />
          以下の手順でリセットしてから再度お試しください：
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-semibold mb-4">📱 iPhone/iPadでのリセット手順</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>「設定」アプリを開く</li>
          <li>画面上部の「[あなたの名前]」をタップ</li>
          <li>「サインインとセキュリティ」をタップ</li>
          <li>「Apple IDでサインイン」をタップ</li>
          <li>アプリ一覧から「タロットAI」を見つけてタップ</li>
          <li>「Apple IDの使用を停止」をタップ</li>
        </ol>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-semibold mb-4">💻 Mac/PCでのリセット手順</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>
            <a
              href="https://appleid.apple.com/account/manage"
              target="_blank"
              className="text-blue-600 underline"
            >
              appleid.apple.com
            </a>
            にアクセス
          </li>
          <li>Apple IDでサインイン</li>
          <li>「サインインとセキュリティ」セクションを開く</li>
          <li>「Apple IDでサインイン」を選択</li>
          <li>「タロットAI」アプリを見つけて削除</li>
        </ol>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          ⚠️ リセット後、再度Apple認証を行うと<strong>初回認証扱い</strong>
          となり、 メールアドレスとお名前の共有確認画面が表示されます。
        </p>
      </div>
    </div>
  );

  const renderGeneralError = () => (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="font-semibold text-red-800 mb-2">認証エラー</h3>
      <p className="text-red-700">
        認証中にエラーが発生しました。しばらく時間をおいて再度お試しください。
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            認証の問題が発生しました
          </h1>
          <p className="text-gray-600">以下の手順で解決できます</p>
        </div>

        {error === "AppleEmailMissing" && provider === "apple"
          ? renderAppleResetGuide()
          : renderGeneralError()}

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => signIn("apple")}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2"
          >
            🍎 Appleで再認証
          </button>

          <button
            onClick={() => signIn("google")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            📧 Googleで認証
          </button>

          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            ホームに戻る
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            解決しない場合は{" "}
            <a href="/support" className="text-blue-600 underline">
              サポートにお問い合わせ
            </a>
            ください
          </p>
        </div>
      </div>
    </div>
  );
}
