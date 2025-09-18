import type { Spread, SpreadCell, SpreadInput } from "@/lib/types";

/**
 * スプレッド一覧を取得
 */
export async function fetchSpreads(): Promise<Spread[]> {
  const response = await fetch("/api/spreads");
  if (!response.ok) {
    throw new Error("スプレッドの取得に失敗しました");
  }
  return response.json();
}

/**
 * 特定のスプレッドを取得
 */
export async function fetchSpreadById(id: string): Promise<Spread> {
  const response = await fetch(`/api/spreads/${id}`);
  if (!response.ok) {
    throw new Error(`スプレッドID: ${id}の取得に失敗しました`);
  }
  return response.json();
}

/**
 * スプレッドを作成
 */
export async function createSpread(data: SpreadInput): Promise<Spread> {
  const response = await fetch("/api/spreads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("スプレッドの作成に失敗しました");
  }
  return response.json();
}

/**
 * スプレッドを更新
 */
export async function updateSpread(
  id: string,
  data: SpreadInput
): Promise<Spread> {
  const response = await fetch(`/api/spreads/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`スプレッドID: ${id}の更新に失敗しました`);
  }
  return response.json();
}

/**
 * スプレッドを削除
 */
export async function deleteSpread(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/spreads/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`スプレッドID: ${id}の削除に失敗しました`);
  }
  return response.json();
}

/**
 * カテゴリ別スプレッド一覧を取得
 */
export async function fetchSpreadsByCategory(
  categoryId: string
): Promise<Spread[]> {
  const response = await fetch(`/api/categories/${categoryId}/spreads`);
  if (!response.ok) {
    throw new Error(`カテゴリID: ${categoryId}のスプレッド取得に失敗しました`);
  }
  return response.json();
}

/**
 * 特定スプレッドのセル一覧を取得
 */
export async function fetchSpreadCells(
  spreadId: string
): Promise<SpreadCell[]> {
  const response = await fetch(`/api/spreads/${spreadId}/cells`);
  if (!response.ok) {
    throw new Error(`スプレッドID: ${spreadId}のセル取得に失敗しました`);
  }
  return response.json();
}

/**
 * 特定セルを取得
 */
export async function fetchSpreadCellById(id: string): Promise<SpreadCell> {
  const response = await fetch(`/api/spread-cells/${id}`);
  if (!response.ok) {
    throw new Error(`セルID: ${id}の取得に失敗しました`);
  }
  return response.json();
}

/**
 * セルを作成
 */
export async function createSpreadCell(
  spreadId: string,
  data: Omit<SpreadCell, "id" | "spread">
): Promise<SpreadCell> {
  const response = await fetch(`/api/spreads/${spreadId}/cells`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("セルの作成に失敗しました");
  }
  return response.json();
}

/**
 * セルを更新
 */
export async function updateSpreadCell(
  id: string,
  data: Omit<SpreadCell, "id" | "spread">
): Promise<SpreadCell> {
  const response = await fetch(`/api/spread-cells/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`セルID: ${id}の更新に失敗しました`);
  }
  return response.json();
}

/**
 * セルを削除
 */
export async function deleteSpreadCell(
  id: string
): Promise<{ success: boolean }> {
  const response = await fetch(`/api/spread-cells/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`セルID: ${id}の削除に失敗しました`);
  }
  return response.json();
}

/**
 * 複数セルを一括更新
 */
export async function bulkUpdateSpreadCells(
  cells: SpreadCell[]
): Promise<{ success: boolean }> {
  const response = await fetch(`/api/spread-cells/bulk`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cells }),
  });
  if (!response.ok) {
    throw new Error("セルの一括更新に失敗しました");
  }
  return response.json();
}
