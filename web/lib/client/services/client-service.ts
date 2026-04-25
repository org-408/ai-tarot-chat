import type { Reading } from "@shared/lib/types";

/**
 * Web クライアント側 API 呼び出しの失敗を表すエラー。
 * status を持たせることで呼び出し側が 401（要再サインイン）を判別できる。
 */
export class ClientApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

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
  const res = await fetch("/api/clients/usage", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ClientApiError(res.status, "利用状況の取得に失敗しました");
  }
  return res.json();
}

export async function fetchReadings(
  take = 20,
  skip = 0
): Promise<ReadingsResponse> {
  const res = await fetch(`/api/clients/readings?take=${take}&skip=${skip}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("占い履歴の取得に失敗しました");
  return res.json();
}

export async function fetchReadingById(id: string): Promise<Reading | null> {
  const res = await fetch(`/api/clients/readings/${id}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("占い履歴の取得に失敗しました");
  return res.json();
}

export async function deleteAccount(): Promise<void> {
  const res = await fetch("/api/clients/me", {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("アカウントの削除に失敗しました");
}

