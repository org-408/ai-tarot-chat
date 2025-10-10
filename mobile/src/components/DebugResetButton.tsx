import { App } from "@capacitor/app";
import { useState } from "react";
import { useResetApp } from "../lib/hooks/useResetApp";

/**
 * デバッグ用リセットボタンコンポーネント
 * - 完全リセット（サーバー+クライアント）
 * - マスターデータのみリセット
 * - Usageのみリセット
 */
export function DebugResetButton() {
  const { resetApp, resetMaster, resetUsage, isResetting, error } =
    useResetApp();
  const [showMenu, setShowMenu] = useState(false);

  /**
   * 完全リセット → アプリ終了
   */
  const handleFullResetAndExit = async () => {
    if (
      confirm(
        "⚠️ 全データをリセットします。\n認証情報も削除され、アプリが終了します。\n\n本当によろしいですか？"
      )
    ) {
      const success = await resetApp();
      if (success) {
        alert("✅ リセット完了！\nアプリを終了します。");

        // アプリを終了（Android/iOS対応）
        try {
          await App.exitApp();
        } catch (error) {
          // exitApp が使えない環境（Webなど）の場合はリロード
          console.warn("App.exitApp() not available, reloading instead", error);
          window.location.reload();
        }
      } else {
        alert(`❌ リセット失敗: ${error?.message || "不明なエラー"}`);
      }
    }
  };

  /**
   * 完全リセット → 再起動
   */
  const handleFullResetAndReload = async () => {
    if (
      confirm(
        "⚠️ 全データをリセットします。\n認証情報も削除され、アプリが再起動します。\n\n本当によろしいですか？"
      )
    ) {
      const success = await resetApp();
      if (success) {
        alert("✅ リセット完了！\nアプリを再起動します。");
        window.location.reload();
      } else {
        alert(`❌ リセット失敗: ${error?.message || "不明なエラー"}`);
      }
    }
  };

  const handleMasterReset = async () => {
    if (
      confirm(
        "マスターデータのみをリセットします。\n認証情報は保持されます。\n\n実行しますか？"
      )
    ) {
      const success = await resetMaster();
      if (success) {
        alert("✅ マスターデータをリセットしました！\nアプリを再起動します。");
        window.location.reload();
      } else {
        alert(`❌ リセット失敗: ${error?.message || "不明なエラー"}`);
      }
    }
  };

  const handleUsageReset = async () => {
    if (
      confirm(
        "利用状況のみをリセットします。\n認証情報は保持されます。\n\n実行しますか？"
      )
    ) {
      const success = await resetUsage();
      if (success) {
        alert("✅ 利用状況をリセットしました！\nアプリを再起動します。");
        window.location.reload();
      } else {
        alert(`❌ リセット失敗: ${error?.message || "不明なエラー"}`);
      }
    }
  };

  return (
    <div className="mt-8 relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isResetting}
        className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isResetting ? "🔄 処理中..." : "🧹 リセットメニュー"}
      </button>

      {showMenu && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[280px]">
          <div className="text-xs text-gray-500 mb-2 font-bold">
            開発用リセットメニュー
          </div>

          <div className="flex flex-col gap-2">
            {/* 完全リセット → 終了 */}
            <button
              onClick={handleFullResetAndExit}
              disabled={isResetting}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50 text-left"
            >
              <div className="font-bold">🚨 完全リセット → 終了</div>
              <div className="text-xs opacity-80">全削除してアプリ終了</div>
            </button>

            {/* 完全リセット → 再起動 */}
            <button
              onClick={handleFullResetAndReload}
              disabled={isResetting}
              className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors disabled:opacity-50 text-left"
            >
              <div className="font-bold">🔄 完全リセット → 再起動</div>
              <div className="text-xs opacity-80">全削除して即座に再起動</div>
            </button>

            {/* マスターデータのみリセット */}
            <button
              onClick={handleMasterReset}
              disabled={isResetting}
              className="px-4 py-2 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 transition-colors disabled:opacity-50 text-left"
            >
              <div className="font-bold">📦 マスターデータ</div>
              <div className="text-xs opacity-80">
                カード・スプレッドデータのみ
              </div>
            </button>

            {/* Usageのみリセット */}
            <button
              onClick={handleUsageReset}
              disabled={isResetting}
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors disabled:opacity-50 text-left"
            >
              <div className="font-bold">📊 利用状況</div>
              <div className="text-xs opacity-80">
                占い回数などの利用データのみ
              </div>
            </button>

            {/* 閉じる */}
            <button
              onClick={() => setShowMenu(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
            >
              閉じる
            </button>

            {error && (
              <div className="mt-2 text-xs text-red-500 bg-red-50 p-2 rounded">
                エラー: {error.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
