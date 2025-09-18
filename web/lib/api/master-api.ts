import type { Plan, ReadingCategory, SpreadLevel } from "@/lib/types";

// プラン一覧を取得
export async function fetchPlans(): Promise<Plan[]> {
  const response = await fetch("/api/plans");
  if (!response.ok) {
    throw new Error("プラン一覧の取得に失敗しました");
  }
  return response.json();
}

// スプレッドレベル一覧を取得
export async function fetchSpreadLevels(): Promise<SpreadLevel[]> {
  const response = await fetch("/api/spread-levels");
  if (!response.ok) {
    throw new Error("スプレッドレベル一覧の取得に失敗しました");
  }
  return response.json();
}

// 読み取りカテゴリ一覧を取得
export async function fetchReadingCategories(): Promise<ReadingCategory[]> {
  const response = await fetch("/api/categories");
  if (!response.ok) {
    throw new Error("カテゴリ一覧の取得に失敗しました");
  }
  return response.json();
}

type MastersResponse = {
  plans: Plan[];
  levels: SpreadLevel[];
  categories: ReadingCategory[];
};

// マスタデータを一括取得
export async function fetchAllMasters(): Promise<MastersResponse> {
  const response = await fetch("/api/masters");
  if (!response.ok) {
    throw new Error("マスタデータの取得に失敗しました");
  }
  return response.json();
}
