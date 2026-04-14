"use client";

import type {
  MasterData,
  Plan,
  ReadingCategory,
  Spread,
  Tarotist,
} from "@shared/lib/types";
import { create } from "zustand";
import { fetchMasterData } from "../services/master-service";

interface MasterState {
  data: MasterData | null;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;

  // Derived selectors
  tarotists: Tarotist[];
  plans: Plan[];
  categories: ReadingCategory[];
  spreads: Spread[];

  init: () => Promise<void>;
}

export const useMasterStore = create<MasterState>((set, get) => ({
  data: null,
  isLoading: false,
  error: null,
  initialized: false,

  get tarotists() {
    return get().data?.tarotists ?? [];
  },
  get plans() {
    return get().data?.plans ?? [];
  },
  get categories() {
    return get().data?.categories ?? [];
  },
  get spreads() {
    return get().data?.spreads ?? [];
  },

  init: async () => {
    if (get().initialized) return;
    set({ isLoading: true, error: null });
    try {
      const data = await fetchMasterData();
      set({ data, isLoading: false, initialized: true });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "不明なエラー",
      });
    }
  },
}));
