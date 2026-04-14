"use client";

import type { DrawnCard, ReadingCategory, Spread, Tarotist } from "@shared/lib/types";
import { create } from "zustand";

interface SalonState {
  // 選択状態
  selectedTarotist: Tarotist | null;
  selectedCategory: ReadingCategory | null;
  selectedSpread: Spread | null;
  customQuestion: string;

  // セッション状態 (永続化しない)
  drawnCards: DrawnCard[];
  isRevealingCompleted: boolean;
  isPersonal: boolean;

  // Setters
  setSelectedTarotist: (t: Tarotist | null) => void;
  setSelectedCategory: (c: ReadingCategory | null) => void;
  setSelectedSpread: (s: Spread | null) => void;
  setCustomQuestion: (q: string) => void;
  setDrawnCards: (cards: DrawnCard[]) => void;
  setIsRevealingCompleted: (v: boolean) => void;
  setIsPersonal: (v: boolean) => void;
  reset: () => void;
}

const initialState = {
  selectedTarotist: null,
  selectedCategory: null,
  selectedSpread: null,
  customQuestion: "",
  drawnCards: [],
  isRevealingCompleted: false,
  isPersonal: false,
};

export const useSalonStore = create<SalonState>((set) => ({
  ...initialState,

  setSelectedTarotist: (t) => set({ selectedTarotist: t }),
  setSelectedCategory: (c) => set({ selectedCategory: c }),
  setSelectedSpread: (s) => set({ selectedSpread: s }),
  setCustomQuestion: (q) => set({ customQuestion: q }),
  setDrawnCards: (cards) => set({ drawnCards: cards }),
  setIsRevealingCompleted: (v) => set({ isRevealingCompleted: v }),
  setIsPersonal: (v) => set({ isPersonal: v }),
  reset: () => set(initialState),
}));
