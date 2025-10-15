import { useEffect } from "react";
import { useMasterStore } from "../stores/master";

/**
 * マスターデータフック
 *
 * グローバルに使えるマスターデータ
 * 認証完了後に useMasterStore().init() を呼ぶこと
 */
export function useMaster(fetch: boolean = true) {
  const {
    isReady,
    masterData,
    isLoading,
    error,
    init,
    refresh,
    checkVersion,
    clear,
    reset,
  } = useMasterStore();

  useEffect(() => {
    if (fetch) {
      init();
    }
    // fetchがfalseならinit()を呼ばない
  }, [fetch, init]);

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

    // アクション
    init,
    refresh,
    checkVersion,
    clear,
    reset,
  };
}
