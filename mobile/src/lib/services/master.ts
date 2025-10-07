import type { MasterData } from "../../../../shared/lib/types";
import { apiClient } from "../utils/apiClient";

export class MasterService {
  async getMasterData() {
    // マスターデータを取得するAPIリクエスト
    console.log("Fetching master data...");
    const data = await apiClient.get<MasterData>("/api/masters");
    console.log("Master data fetched:", data);
    if (!data || "error" in data) {
      throw new Error("Failed to fetch master data");
    }
    return data;
  }
}

export const masterService = new MasterService();
