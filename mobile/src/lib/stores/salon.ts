import type { UIMessage } from "ai";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  DrawnCard,
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../../../shared/lib/types";
import { storeRepository } from "../../lib/repositories/store";
import type {
  LowerViewerModeType,
  SelectTargetMode,
  SpreadViewModeType,
  UpperViewerModeType,
} from "../../types";
import { useMasterStore } from "./master";

interface SalonState {
  selectedTarotist: Tarotist;
  selectedCategory: ReadingCategory;
  customQuestion: string;
  selectedSpread: Spread;
  drawnCards: DrawnCard[];
  isRevealingCompleted: boolean;
  selectedTargetMode: SelectTargetMode;
  spreadViewerMode: SpreadViewModeType;
  upperViewerMode: UpperViewerModeType;
  lowerViewerMode: LowerViewerModeType;
  isPersonal: boolean;
  messages: UIMessage[];
  init: () => void;
  setSelectedTarotist: (tarotist: Tarotist) => void;
  setSelectedCategory: (category: ReadingCategory) => void;
  setCustomQuestion: (question: string) => void;
  setSelectedSpread: (spread: Spread) => void;
  setDrawnCards: (cards: DrawnCard[]) => void;
  setIsRevealingCompleted: (completed: boolean) => void;
  setSelectedTargetMode: (mode: SelectTargetMode) => void;
  setSpreadViewerMode: (mode: SpreadViewModeType) => void;
  setUpperViewerMode: (mode: UpperViewerModeType) => void;
  setLowerViewerMode: (mode: LowerViewerModeType) => void;
  setIsPersonal: (isPersonal: boolean) => void;
  setMessages: (messages: UIMessage[]) => void;
}

// 初期値をマスターデータから取得する
const initialTarotist: Tarotist = useMasterStore
  .getState()
  .masterData.tarotists.find((t) => t.plan?.code === "GUEST")!;
const initialCategory: ReadingCategory = useMasterStore
  .getState()
  .masterData.categories.find((c) => c.no === 1)!;
const initialSpread: Spread = useMasterStore
  .getState()
  .masterData.spreads.find((s) => s.plan?.code === "GUEST")!;

export const useSalonStore = create<SalonState>()(
  persist(
    (set) => ({
      selectedTarotist: initialTarotist,
      selectedCategory: initialCategory,
      customQuestion: "",
      selectedSpread: initialSpread,
      drawnCards: [],
      isRevealingCompleted: false,
      selectedTargetMode: "tarotist",
      spreadViewerMode: "grid",
      upperViewerMode: "profile",
      lowerViewerMode: "selector",
      isPersonal: false,
      messages: [],
      init: () => {
        set({
          drawnCards: [],
          isRevealingCompleted: false,
          spreadViewerMode: "grid",
          upperViewerMode: "profile",
          lowerViewerMode: "selector",
          isPersonal: false,
        });
      },
      setSelectedTarotist: (tarotist) => set({ selectedTarotist: tarotist }),
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setCustomQuestion: (question) => set({ customQuestion: question }),
      setSelectedSpread: (spread) => set({ selectedSpread: spread }),
      setDrawnCards: (cards) => set({ drawnCards: cards }),
      setIsRevealingCompleted: (completed) =>
        set({ isRevealingCompleted: completed }),
      setSelectedTargetMode: (mode) => set({ selectedTargetMode: mode }),
      setSpreadViewerMode: (mode) => set({ spreadViewerMode: mode }),
      setUpperViewerMode: (mode) => set({ upperViewerMode: mode }),
      setLowerViewerMode: (mode) => set({ lowerViewerMode: mode }),
      setIsPersonal: (isPersonal) => set({ isPersonal }),
      setMessages: (messages) => set({ messages }),
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
