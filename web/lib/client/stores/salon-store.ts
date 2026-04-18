"use client";

import type { DrawnCard, ReadingCategory, Spread, Tarotist } from "@shared/lib/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface SalonState {
  // クイック占い選択（永続化）
  quickTarotist: Tarotist | null;
  quickSpread: Spread | null;
  quickCategory: ReadingCategory | null;

  // パーソナル占い選択（永続化）
  personalTarotist: Tarotist | null;
  personalSpread: Spread | null;
  personalCategory: ReadingCategory | null;

  // セッション状態（永続化しない）
  drawnCards: DrawnCard[];
  isRevealingCompleted: boolean;
  isPersonal: boolean;

  // Setters
  setQuickTarotist: (t: Tarotist | null) => void;
  setQuickSpread: (s: Spread | null) => void;
  setQuickCategory: (c: ReadingCategory | null) => void;
  setPersonalTarotist: (t: Tarotist | null) => void;
  setPersonalSpread: (s: Spread | null) => void;
  setPersonalCategory: (c: ReadingCategory | null) => void;
  setDrawnCards: (cards: DrawnCard[]) => void;
  setIsRevealingCompleted: (v: boolean) => void;
  setIsPersonal: (v: boolean) => void;
  resetSession: () => void;
}

const sessionInitial = {
  drawnCards: [],
  isRevealingCompleted: false,
  isPersonal: false,
};

export const useSalonStore = create<SalonState>()(
  persist(
    (set) => ({
      quickTarotist: null,
      quickSpread: null,
      quickCategory: null,
      personalTarotist: null,
      personalSpread: null,
      personalCategory: null,
      ...sessionInitial,

      setQuickTarotist: (t) => set({ quickTarotist: t }),
      setQuickSpread: (s) => set({ quickSpread: s }),
      setQuickCategory: (c) => set({ quickCategory: c }),
      setPersonalTarotist: (t) => set({ personalTarotist: t }),
      setPersonalSpread: (s) => set({ personalSpread: s }),
      setPersonalCategory: (c) => set({ personalCategory: c }),
      setDrawnCards: (cards) => set({ drawnCards: cards }),
      setIsRevealingCompleted: (v) => set({ isRevealingCompleted: v }),
      setIsPersonal: (v) => set({ isPersonal: v }),
      resetSession: () => set(sessionInitial),
    }),
    {
      name: "salon-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        quickTarotist: state.quickTarotist,
        quickSpread: state.quickSpread,
        quickCategory: state.quickCategory,
        personalTarotist: state.personalTarotist,
        personalSpread: state.personalSpread,
        personalCategory: state.personalCategory,
      }),
    }
  )
);
