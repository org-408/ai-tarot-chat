import type { Reading, SaveReadingInput } from "@shared/lib/types";

export interface UsageStats {
  plan: {
    code: string;
    name: string;
    no: number;
    maxReadings: number;
    maxPersonal: number;
    hasPersonal: boolean;
    hasHistory: boolean;
  };
  remainingReadings: number;
  remainingPersonal: number;
  dailyReadingsCount: number;
  dailyPersonalCount: number;
}

export interface ReadingsResponse {
  readings: Reading[];
  total: number;
}

export async function fetchUsage(): Promise<UsageStats> {
  const res = await fetch("/api/clients/usage", { credentials: "include" });
  if (!res.ok) throw new Error("利用状況の取得に失敗しました");
  return res.json();
}

export async function fetchReadings(
  take = 20,
  skip = 0
): Promise<ReadingsResponse> {
  const res = await fetch(`/api/clients/readings?take=${take}&skip=${skip}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("占い履歴の取得に失敗しました");
  return res.json();
}

export async function saveReading(data: SaveReadingInput): Promise<Reading> {
  const res = await fetch("/api/clients/readings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("占い結果の保存に失敗しました");
  return res.json();
}

export async function deleteAccount(): Promise<void> {
  const res = await fetch("/api/clients/me", {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("アカウントの削除に失敗しました");
}

