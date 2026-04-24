import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type {
  Plan,
  ReadingCategory,
  Spread,
  SpreadCell,
  SpreadLevel,
  TarotDeck,
  Tarotist,
} from "../../../../shared/lib/types";
import { useMasterStore } from "../stores/master";

/**
 * i18n.en フィールドが付与されたレコードを現在言語で解決する。
 * `lang === "en"` かつ `record.i18n.en` があれば、EN フィールドで上書き。
 * 元の JA フィールドは i18n.en に格納されているが、本関数は「表示用のオブジェクト」を返すため
 * 直接の field アクセス (record.name 等) が EN になる。
 */
function resolveCategory(c: ReadingCategory, lang: string): ReadingCategory {
  if (lang === "en" && c.i18n?.en) return { ...c, ...c.i18n.en };
  return c;
}
function resolvePlan(p: Plan, lang: string): Plan {
  if (lang === "en" && p.i18n?.en) return { ...p, ...p.i18n.en };
  return p;
}
function resolveSpreadLevel(l: SpreadLevel, lang: string): SpreadLevel {
  if (lang === "en" && l.i18n?.en) return { ...l, ...l.i18n.en };
  return l;
}
function resolveSpreadCell(cell: SpreadCell, lang: string): SpreadCell {
  if (lang === "en" && cell.i18n?.en) return { ...cell, ...cell.i18n.en };
  return cell;
}
function resolveSpread(s: Spread, lang: string): Spread {
  const cells = s.cells?.map((c) => resolveSpreadCell(c, lang));
  if (lang === "en" && s.i18n?.en) {
    return { ...s, ...s.i18n.en, ...(cells ? { cells } : {}) };
  }
  return cells ? { ...s, cells } : s;
}
function resolveTarotist(t: Tarotist, lang: string): Tarotist {
  if (lang === "en" && t.i18n?.en) return { ...t, ...t.i18n.en };
  return t;
}

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

  const plans = useMemo<Plan[]>(
    () => (masterData?.plans ?? []).map((p) => resolvePlan(p, currentLang)),
    [masterData?.plans, currentLang],
  );
  const categories = useMemo<ReadingCategory[]>(
    () =>
      (masterData?.categories ?? []).map((c) => resolveCategory(c, currentLang)),
    [masterData?.categories, currentLang],
  );
  const levels = useMemo<SpreadLevel[]>(
    () =>
      (masterData?.levels ?? []).map((l) => resolveSpreadLevel(l, currentLang)),
    [masterData?.levels, currentLang],
  );
  const spreads = useMemo<Spread[]>(
    () => (masterData?.spreads ?? []).map((s) => resolveSpread(s, currentLang)),
    [masterData?.spreads, currentLang],
  );
  const tarotists = useMemo<Tarotist[]>(
    () =>
      (masterData?.tarotists ?? []).map((t) => resolveTarotist(t, currentLang)),
    [masterData?.tarotists, currentLang],
  );

  // 履歴表示などで「保存時点の言語版オブジェクト」を現在言語に引き直す用。
  // 主キーは id (言語非依存)。resolved collections から逆引きし、見つからなければ
  // undefined を返す (呼び出し側で元オブジェクトへフォールバックする)。
  const spreadById = useMemo(
    () => new Map(spreads.map((s) => [s.id, s])),
    [spreads],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const tarotistById = useMemo(
    () => new Map(tarotists.map((t) => [t.id, t])),
    [tarotists],
  );

  return {
    // 状態
    isReady,
    isLoading,
    error,

    // データ (現在言語で解決済み)
    masterData,
    decks,
    allDecks,
    spreads,
    categories,
    levels,
    plans,
    tarotists,
    version: masterData?.version || null,

    // id からの現在言語解決 (履歴表示などで利用)
    spreadById,
    categoryById,
    tarotistById,

    // アクション（主にリフレッシュやバージョンチェック用）
    refresh,
    checkVersion,
    clear,
    reset,
  };
}
