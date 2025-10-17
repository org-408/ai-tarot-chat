import { useState } from "react";
import { resetAppData } from "../utils/resetApp";

/**
 * アプリデータリセットフック
 * - UI表示用のローディング状態管理
 * - エラーハンドリング
 * - リセット処理実行
 *
 * 提供する機能：
 * - resetApp: 完全リセット（全データ削除）
 * - resetMaster: マスターデータのみリセット
 * - resetUsage: Usageのみリセット
 */
export function useResetApp() {
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 完全リセット
   * - 認証情報を含む全データを削除
   * - 実行後はアプリの再起動が必要
   */
  const resetApp = async () => {
    try {
      setIsResetting(true);
      setError(null);
      await resetAppData();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unknown error occurred")
      );
      return false;
    } finally {
      setIsResetting(false);
    }
  };
  return {
    resetApp,
    isResetting,
    error,
  };
}
