import { useState } from "react";
import {
  resetAppData,
  resetMasterDataOnly,
  resetUsageOnly,
} from "../utils/resetApp";

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

  /**
   * マスターデータのみリセット
   * - 認証情報は保持
   * - マスターデータを再取得したい場合に使用
   */
  const resetMaster = async () => {
    try {
      setIsResetting(true);
      setError(null);
      await resetMasterDataOnly();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to reset master data")
      );
      return false;
    } finally {
      setIsResetting(false);
    }
  };

  /**
   * Usageのみリセット
   * - 認証情報は保持
   * - Usageを再取得したい場合に使用
   */
  const resetUsage = async () => {
    try {
      setIsResetting(true);
      setError(null);
      await resetUsageOnly();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to reset usage data")
      );
      return false;
    } finally {
      setIsResetting(false);
    }
  };

  return {
    resetApp,
    resetMaster,
    resetUsage,
    isResetting,
    error,
  };
}
