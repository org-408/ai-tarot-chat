import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../../../shared/lib/types";
import { storeRepository } from "../../lib/repositories/store";

interface SalonState {
  lastTarotist: Tarotist | null;
  lastCategory: ReadingCategory | null;
  lastSpread: Spread | null;
  setLastTarotist: (tarotist: Tarotist) => void;
  setLastCategory: (category: ReadingCategory) => void;
  setLastSpread: (spread: Spread) => void;
}

export const useSalonStore = create<SalonState>()(
  persist(
    (set) => ({
      lastTarotist: null,
      lastCategory: null,
      lastSpread: null,
      setLastTarotist: (tarotist) => set({ lastTarotist: tarotist }),
      setLastCategory: (category) => set({ lastCategory: category }),
      setLastSpread: (spread) => set({ lastSpread: spread }),
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
