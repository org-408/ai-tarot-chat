"use client";

import * as masterApi from "@/lib/api/master-api";
import { useMasterStore } from "@/lib/store/master-store";
import type { Plan, ReadingCategory, SpreadLevel } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

// マスタデータのクエリキー
export const MASTER_KEYS = {
  PLANS: ["masters", "plans"],
  LEVELS: ["masters", "levels"],
  CATEGORIES: ["masters", "categories"],
  ALL: ["masters", "all"],
};

// プラン一覧を取得するフック
export function usePlans() {
  return useQuery<Plan[]>({
    queryKey: MASTER_KEYS.PLANS,
    queryFn: masterApi.fetchPlans,
    staleTime: Infinity, // マスタデータは頻繁に変更されないため長くキャッシュ
    refetchOnWindowFocus: false,
  });
}

// スプレッドレベル一覧を取得するフック
export function useSpreadLevels() {
  return useQuery<SpreadLevel[]>({
    queryKey: MASTER_KEYS.LEVELS,
    queryFn: masterApi.fetchSpreadLevels,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

// 読み取りカテゴリ一覧を取得するフック
export function useReadingCategories() {
  return useQuery<ReadingCategory[]>({
    queryKey: MASTER_KEYS.CATEGORIES,
    queryFn: masterApi.fetchReadingCategories,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

// 全マスタデータを一括取得するフック
export function useAllMasters() {
  const plans = usePlans();
  const levels = useSpreadLevels();
  const categories = useReadingCategories();

  return {
    plans: plans.data || [],
    levels: levels.data || [],
    categories: categories.data || [],
    isLoading: plans.isLoading || levels.isLoading || categories.isLoading,
    isError: plans.isError || levels.isError || categories.isError,
    error: plans.error || levels.error || categories.error,
  };
}

// マスタデータから名前からIDを取得するユーティリティ
export function getLevelIdByName(levels: SpreadLevel[], name: string): string {
  const level = levels.find((l) => l.name === name);
  return level?.id || "";
}

export function getPlanIdByName(plans: Plan[], name: string): string {
  const plan = plans.find((p) => p.name === name);
  return plan?.id || "";
}

export function getCategoryIdByName(
  categories: ReadingCategory[],
  name: string
): string {
  const category = categories.find((c) => c.name === name);
  return category?.id || "";
}

// Zustandストアを使用するフック
export function useMasterStoreData() {
  const {
    plans,
    levels,
    categories,
    isLoading,
    error,
    initialized,
    fetchMasters,
    getLevelIdByName,
    getPlanIdByName,
    getCategoryIdByName,
  } = useMasterStore();

  useEffect(() => {
    if (!initialized) {
      fetchMasters();
    }
  }, [initialized, fetchMasters]);

  return {
    plans,
    levels,
    categories,
    isLoading,
    error,
    getLevelIdByName,
    getPlanIdByName,
    getCategoryIdByName,
  };
}
