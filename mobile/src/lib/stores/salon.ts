import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  DrawnCard,
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../../../shared/lib/types";
import { storeRepository } from "../../lib/repositories/store";
import type { SelectTargetMode, SpreadViewModeType } from "../../types";

interface SalonState {
  selectedTarotist: Tarotist | null;
  selectedCategory: ReadingCategory | null;
  selectedSpread: Spread | null;
  drawnCards: DrawnCard[];
  selectedTargetMode: SelectTargetMode;
  spreadViewerMode: SpreadViewModeType;
  setSelectedTarotist: (tarotist: Tarotist) => void;
  setSelectedCategory: (category: ReadingCategory) => void;
  setSelectedSpread: (spread: Spread) => void;
  setDrawnCards: (cards: DrawnCard[]) => void;
  setSelectedTargetMode: (mode: SelectTargetMode) => void;
  setSpreadViewerMode: (mode: SpreadViewModeType) => void;
}

export const useSalonStore = create<SalonState>()(
  persist(
    (set) => ({
      selectedTarotist: null,
      selectedCategory: null,
      selectedSpread: null,
      drawnCards: [],
      selectedTargetMode: "tarotist",
      spreadViewerMode: "grid",
      setSelectedTarotist: (tarotist) => set({ selectedTarotist: tarotist }),
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setSelectedSpread: (spread) => set({ selectedSpread: spread }),
      setDrawnCards: (cards) => set({ drawnCards: cards }),
      setSelectedTargetMode: (mode) => set({ selectedTargetMode: mode }),
      setSpreadViewerMode: (mode) => set({ spreadViewerMode: mode }),
    }),
    {
      name: "salon-storage",
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          const value = await storeRepository.get(name);
          return value ? JSON.stringify(value) : null;
        },
        setItem: async (name: string, value: string) => {
          const parsed = JSON.parse(value);
          await storeRepository.set(name, parsed);
        },
        removeItem: async (name: string) => {
          await storeRepository.delete(name);
        },
      })),
    }
  )
);
