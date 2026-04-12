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
  selectedPersonalTarotist: Tarotist;
  selectedCategory: ReadingCategory;
  customQuestion: string;
  selectedSpread: Spread;
  lastClaraCategoryId: string | null;
  lastClaraSpreadId: string | null;
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
  setSelectedPersonalTarotist: (tarotist: Tarotist) => void;
  setSelectedCategory: (category: ReadingCategory) => void;
  setCustomQuestion: (question: string) => void;
  setSelectedSpread: (spread: Spread) => void;
  setLastClaraSelection: (
    categoryId: string | null,
    spreadId: string | null
  ) => void;
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
const initialPersonalTarotist: Tarotist = useMasterStore
  .getState()
  .masterData.tarotists.find((t) => t.name === "Ariadne")!;
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
      selectedPersonalTarotist: initialPersonalTarotist,
      selectedCategory: initialCategory,
      customQuestion: "",
      selectedSpread: initialSpread,
      lastClaraCategoryId: null,
      lastClaraSpreadId: null,
      drawnCards: [],
      isRevealingCompleted: false,
      selectedTargetMode: "tarotist",
      spreadViewerMode: "grid",
      upperViewerMode: "profile",
      lowerViewerMode: "selector",
      isPersonal: false,
      messages: [],
      init: () => {
        set((state) => ({
          selectedCategory: state.selectedCategory?.id
            ? state.selectedCategory
            : initialCategory,
          customQuestion: "",
          selectedSpread: state.selectedSpread?.id
            ? state.selectedSpread
            : initialSpread,
          drawnCards: [],
          isRevealingCompleted: false,
          spreadViewerMode: "grid",
          upperViewerMode: "profile",
          lowerViewerMode: "selector",
          isPersonal: false,
          messages: [],
        }));
      },
      setSelectedTarotist: (tarotist) => set({ selectedTarotist: tarotist }),
      setSelectedPersonalTarotist: (tarotist) => set({ selectedPersonalTarotist: tarotist }),
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setCustomQuestion: (question) => set({ customQuestion: question }),
      setSelectedSpread: (spread) => set({ selectedSpread: spread }),
      setLastClaraSelection: (categoryId, spreadId) =>
        set({
          lastClaraCategoryId: categoryId,
          lastClaraSpreadId: spreadId,
        }),
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
      // セッション固有の状態は永続化しない。
      // isPersonal / drawnCards / isRevealingCompleted / messages は
      // init() でリセットされる揮発性フィールドであり、非同期 hydration が
      // init() + setIsPersonal(true) の後に完了すると "isPersonal: false" で
      // 上書きされ Phase2 が誤動作する原因となる。
      partialize: (state) => ({
        selectedTarotist: state.selectedTarotist,
        selectedPersonalTarotist: state.selectedPersonalTarotist,
        selectedCategory: state.selectedCategory,
        customQuestion: state.customQuestion,
        selectedSpread: state.selectedSpread,
        lastClaraCategoryId: state.lastClaraCategoryId,
        lastClaraSpreadId: state.lastClaraSpreadId,
        selectedTargetMode: state.selectedTargetMode,
        spreadViewerMode: state.spreadViewerMode,
        upperViewerMode: state.upperViewerMode,
        lowerViewerMode: state.lowerViewerMode,
      }),
    }
  )
);
