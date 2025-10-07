import { useState } from "react";
import { resetAppData } from "../utils/resetApp";

/**
 * アプリデータリセットフック
 * - UI表示用のローディング状態管理
 * - エラーハンドリング
 * - リセット処理実行
 */
export function useResetApp() {
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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
