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

interface ReadingState {
  selectedTarotist: Tarotist | null;
  selectedPersonalTarotist: Tarotist | null;
  quickCategory: ReadingCategory;
  personalCategory: ReadingCategory | null;
  customQuestion: string;
  quickSpread: Spread;
  personalSpread: Spread | null;
  lastClaraCategoryId: string | null;
  lastClaraSpreadId: string | null;
  drawnCards: DrawnCard[];
  isRevealingCompleted: boolean;
  selectedTargetMode: SelectTargetMode;
  selectedPersonalTargetMode: SelectTargetMode;
  spreadViewerMode: SpreadViewModeType;
  upperViewerMode: UpperViewerModeType;
  lowerViewerMode: LowerViewerModeType;
  isPersonal: boolean;
  messages: UIMessage[];
  init: () => void;
  setSelectedTarotist: (tarotist: Tarotist | null) => void;
  setSelectedPersonalTarotist: (tarotist: Tarotist | null) => void;
  setQuickCategory: (category: ReadingCategory) => void;
  setPersonalCategory: (category: ReadingCategory | null) => void;
  setCustomQuestion: (question: string) => void;
  setQuickSpread: (spread: Spread) => void;
  setPersonalSpread: (spread: Spread | null) => void;
  setLastClaraSelection: (
    categoryId: string | null,
    spreadId: string | null
  ) => void;
  setDrawnCards: (cards: DrawnCard[]) => void;
  setIsRevealingCompleted: (completed: boolean) => void;
  setSelectedTargetMode: (mode: SelectTargetMode) => void;
  setSelectedPersonalTargetMode: (mode: SelectTargetMode) => void;
  setSpreadViewerMode: (mode: SpreadViewModeType) => void;
  setUpperViewerMode: (mode: UpperViewerModeType) => void;
  setLowerViewerMode: (mode: LowerViewerModeType) => void;
  setIsPersonal: (isPersonal: boolean) => void;
  setMessages: (messages: UIMessage[]) => void;
}

// 初期値をマスターデータから取得する
// 占い師は未選択（null）スタート。プラン変更時に現プランで使えない占い師は
// quick-page で null に戻され、ユーザーに再選択を促す。
const initialCategory: ReadingCategory = useMasterStore
  .getState()
  .masterData.categories.find((c) => c.no === 1)!;
const initialSpread: Spread = useMasterStore
  .getState()
  .masterData.spreads.find((s) => s.plan?.code === "GUEST")!;

export const useReadingStore = create<ReadingState>()(
  persist(
    (set) => ({
      selectedTarotist: null,
      selectedPersonalTarotist: null,
      quickCategory: initialCategory,
      personalCategory: null,
      customQuestion: "",
      quickSpread: initialSpread,
      personalSpread: null,
      lastClaraCategoryId: null,
      lastClaraSpreadId: null,
      drawnCards: [],
      isRevealingCompleted: false,
      selectedTargetMode: "tarotist",
      selectedPersonalTargetMode: "tarotist",
      spreadViewerMode: "grid",
      upperViewerMode: "profile",
      lowerViewerMode: "selector",
      isPersonal: false,
      messages: [],
      init: () => {
        set((state) => ({
          quickCategory: state.quickCategory?.id
            ? state.quickCategory
            : initialCategory,
          customQuestion: "",
          quickSpread: state.quickSpread?.id
            ? state.quickSpread
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
      setQuickCategory: (category) => set({ quickCategory: category }),
      setPersonalCategory: (category) => set({ personalCategory: category }),
      setCustomQuestion: (question) => set({ customQuestion: question }),
      setQuickSpread: (spread) => set({ quickSpread: spread }),
      setPersonalSpread: (spread) => set({ personalSpread: spread }),
      setLastClaraSelection: (categoryId, spreadId) =>
        set({
          lastClaraCategoryId: categoryId,
          lastClaraSpreadId: spreadId,
        }),
      setDrawnCards: (cards) => set({ drawnCards: cards }),
      setIsRevealingCompleted: (completed) =>
        set({ isRevealingCompleted: completed }),
      setSelectedTargetMode: (mode) => set({ selectedTargetMode: mode }),
      setSelectedPersonalTargetMode: (mode) =>
        set({ selectedPersonalTargetMode: mode }),
      setSpreadViewerMode: (mode) => set({ spreadViewerMode: mode }),
      setUpperViewerMode: (mode) => set({ upperViewerMode: mode }),
      setLowerViewerMode: (mode) => set({ lowerViewerMode: mode }),
      setIsPersonal: (isPersonal) => set({ isPersonal }),
      setMessages: (messages) => set({ messages }),
    }),
    {
      // 永続化キーは互換性のため "salon-storage" のまま維持
      name: "salon-storage",
      version: 2,
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
      migrate: (persistedState: unknown, version) => {
        const state = persistedState as Record<string, unknown> | null;
        if (!state) return persistedState as ReadingState;

        if (version < 2) {
          const legacyCategory = state.selectedCategory as ReadingCategory | undefined;
          const legacySpread = state.selectedSpread as Spread | undefined;

          return {
            ...state,
            quickCategory: (state.quickCategory as ReadingCategory | undefined) ?? legacyCategory ?? initialCategory,
            personalCategory: (state.personalCategory as ReadingCategory | null | undefined) ?? null,
            quickSpread: (state.quickSpread as Spread | undefined) ?? legacySpread ?? initialSpread,
            personalSpread: (state.personalSpread as Spread | null | undefined) ?? null,
          };
        }

        return state as unknown as ReadingState;
      },
      // セッション固有の状態は永続化しない。
      // isPersonal / drawnCards / isRevealingCompleted / messages は
      // init() でリセットされる揮発性フィールドであり、非同期 hydration が
      // init() + setIsPersonal(true) の後に完了すると "isPersonal: false" で
      // 上書きされ Phase2 が誤動作する原因となる。
      partialize: (state) => ({
        selectedTarotist: state.selectedTarotist,
        selectedPersonalTarotist: state.selectedPersonalTarotist,
        quickCategory: state.quickCategory,
        personalCategory: state.personalCategory,
        customQuestion: state.customQuestion,
        quickSpread: state.quickSpread,
        personalSpread: state.personalSpread,
        lastClaraCategoryId: state.lastClaraCategoryId,
        lastClaraSpreadId: state.lastClaraSpreadId,
        selectedTargetMode: state.selectedTargetMode,
        selectedPersonalTargetMode: state.selectedPersonalTargetMode,
        spreadViewerMode: state.spreadViewerMode,
        upperViewerMode: state.upperViewerMode,
        lowerViewerMode: state.lowerViewerMode,
      }),
    }
  )
);
