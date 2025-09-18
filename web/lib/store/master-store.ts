import * as masterApi from "@/lib/api/master-api";
import type { Plan, ReadingCategory, SpreadLevel } from "@/lib/types";
import { create } from "zustand";

type MasterState = {
  plans: Plan[];
  levels: SpreadLevel[];
  categories: ReadingCategory[];
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
  fetchMasters: () => Promise<void>;
  getLevelIdByName: (name: string) => string;
  getPlanIdByName: (name: string) => string;
  getCategoryIdByName: (name: string) => string;
};

export const useMasterStore = create<MasterState>((set, get) => ({
  plans: [],
  levels: [],
  categories: [],
  isLoading: false,
  error: null,
  initialized: false,

  // マスタデータの取得
  fetchMasters: async () => {
    // 既に初期化済みなら再取得しない
    if (get().initialized && get().plans.length > 0) return;

    set({ isLoading: true, error: null });
    try {
      const data = await masterApi.fetchAllMasters();
      set({
        plans: data.plans,
        levels: data.levels,
        categories: data.categories,
        isLoading: false,
        initialized: true,
      });
    } catch (error) {
      console.error("マスタデータ取得エラー:", error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "不明なエラー",
      });
    }
  },

  // ユーティリティ関数: レベル名からIDを取得
  getLevelIdByName: (name) => {
    const level = get().levels.find((l) => l.name === name);
    return level?.id || "";
  },

  // ユーティリティ関数: プラン名からIDを取得
  getPlanIdByName: (name) => {
    const plan = get().plans.find((p) => p.name === name);
    return plan?.id || "";
  },

  // ユーティリティ関数: カテゴリ名からIDを取得
  getCategoryIdByName: (name) => {
    const category = get().categories.find((c) => c.name === name);
    return category?.id || "";
  },
}));
