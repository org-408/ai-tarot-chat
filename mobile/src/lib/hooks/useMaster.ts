import { useMasterStore } from "../stores/master";

/**
 * マスターデータフック
 *
 * グローバルに使えるマスターデータ
 *
 * ⚠️ 初期化は lifecycle.ts が管理
 * このフックは単にストアの状態を返すだけ
 */
export function useMaster() {
  const {
    isReady,
    masterData,
    isLoading,
    error,
    refresh,
    checkVersion,
    clear,
    reset,
  } = useMasterStore();

  return {
    // 状態
    isReady,
    isLoading,
    error,

    // データ
    masterData,
    decks: masterData?.decks || [],
    spreads: masterData?.spreads || [],
    categories: masterData?.categories || [],
    levels: masterData?.levels || [],
    plans: masterData?.plans || [],
    tarotists: masterData?.tarotists || [],
    version: masterData?.version || null,

    // アクション（主にリフレッシュやバージョンチェック用）
    refresh,
    checkVersion,
    clear,
    reset,
  };
}
