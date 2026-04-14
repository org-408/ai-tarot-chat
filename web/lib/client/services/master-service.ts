import type { MasterData } from "@shared/lib/types";

export async function fetchMasterData(): Promise<MasterData> {
  const res = await fetch("/api/masters", { credentials: "include" });
  if (!res.ok) throw new Error("マスターデータの取得に失敗しました");
  return res.json();
}
