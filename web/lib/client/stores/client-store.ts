"use client";

import type { Reading } from "@shared/lib/types";
import { create } from "zustand";
import {
  ClientApiError,
  fetchReadings,
  fetchUsage,
  type UsageStats,
} from "../services/client-service";

interface ClientState {
  usage: UsageStats | null;
  readings: Reading[];
  readingsTotal: number;
  readingsTake: number;
  readingsSkip: number;
  isLoadingUsage: boolean;
  isLoadingReadings: boolean;
  usageError: string | null;
  readingsError: string | null;
  // NextAuth セッションが切れた状態。401 検知時に立て、UsagePoller 停止 +
  // セッション切れバナー表示のトリガーに使う。
  isSessionExpired: boolean;

  refreshUsage: () => Promise<void>;
  fetchReadings: (opts?: { next?: boolean }) => Promise<void>;
  clearReadings: () => void;
}

export const useClientStore = create<ClientState>((set, get) => ({
  usage: null,
  readings: [],
  readingsTotal: 0,
  readingsTake: 20,
  readingsSkip: 0,
  isLoadingUsage: false,
  isLoadingReadings: false,
  usageError: null,
  readingsError: null,
  isSessionExpired: false,

  refreshUsage: async () => {
    if (get().isSessionExpired) return;
    set({ isLoadingUsage: true, usageError: null });
    try {
      const usage = await fetchUsage();
      set({ usage, isLoadingUsage: false });
    } catch (error) {
      const isAuthError =
        error instanceof ClientApiError && error.status === 401;
      set({
        isLoadingUsage: false,
        usageError: error instanceof Error ? error.message : "エラー",
        isSessionExpired: isAuthError ? true : get().isSessionExpired,
      });
    }
  },

  fetchReadings: async (opts = {}) => {
    const { next = false } = opts;
    const { readingsTake, readingsSkip, readings } = get();
    const skip = next ? readingsSkip + readingsTake : 0;

    set({ isLoadingReadings: true, readingsError: null });
    try {
      const result = await fetchReadings(readingsTake, skip);
      // 重複排除
      const existingIds = new Set(next ? readings.map((r) => r.id) : []);
      const newReadings = result.readings.filter((r) => !existingIds.has(r.id));
      set({
        readings: next ? [...readings, ...newReadings] : result.readings,
        readingsTotal: result.total,
        readingsSkip: skip,
        isLoadingReadings: false,
      });
    } catch (error) {
      set({
        isLoadingReadings: false,
        readingsError: error instanceof Error ? error.message : "エラー",
      });
    }
  },

  clearReadings: () =>
    set({ readings: [], readingsTotal: 0, readingsSkip: 0 }),
}));
