import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TarotDeck } from "../../../../shared/lib/types";
import { useMasterStore } from "../stores/master";

/**
 * マスターデータフック
 *
 * グローバルに使えるマスターデータ
 *
 * ⚠️ 初期化は lifecycle.ts が管理
 * このフックは単にストアの状態を返すだけ
 *
 * Phase 2.1: `decks` は現在の言語 (ja/en) でフィルタされたもののみを
 * 返す。サーバー API は全言語分の deck を返却し、クライアントで絞る。
 * 履歴など異なる言語で保存されたカードの解決用に `allDecks` (全言語)
 * も併せて公開する。
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

  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith("en") ? "en" : "ja";

  const allDecks: TarotDeck[] = masterData?.decks ?? [];

  const decks = useMemo<TarotDeck[]>(() => {
    if (allDecks.length === 0) return allDecks;
    const filtered = allDecks.filter(
      (d) => !d.language || d.language === currentLang,
    );
    // 安全策: 対象言語の deck が無ければ全件返す (旧バンドル互換)。
    return filtered.length > 0 ? filtered : allDecks;
  }, [allDecks, currentLang]);

  return {
    // 状態
    isReady,
    isLoading,
    error,

    // データ
    masterData,
    decks,
    allDecks,
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
