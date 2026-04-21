import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { logWithContext } from "../logger/logger";
import { storeRepository } from "../repositories/store";
import type { PageType } from "../../types";

interface AppState {
  // 状態
  lastPageType: PageType | null;

  // アクション
  setLastPageType: (page: PageType) => void;
  resetLastPageType: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // 初期状態
      lastPageType: null,

      // アクション
      setLastPageType: (page) => {
        logWithContext("debug", "[AppStore] setLastPageType", { page });
        set({ lastPageType: page });
      },

      resetLastPageType: () => {
        logWithContext("debug", "[AppStore] resetLastPageType");
        set({ lastPageType: "home" });
      },
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const v = await storeRepository.get(name);
          return v ? JSON.stringify(v) : null;
        },
        setItem: async (name, value) => {
          await storeRepository.set(name, JSON.parse(value));
        },
        removeItem: async (name) => {
          await storeRepository.delete(name);
        },
      })),
    },
  ),
);
