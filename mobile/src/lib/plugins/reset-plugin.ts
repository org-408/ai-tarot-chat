import { registerPlugin } from "@capacitor/core";

/**
 * アプリデータをリセットするネイティブプラグインのインターフェース
 */
export interface ResetPlugin {
  /**
   * アプリデータを完全にリセット（ネイティブレイヤー含む）
   */
  resetAppData(): Promise<{ success: boolean }>;

  /**
   * アプリキャッシュのみをクリア
   */
  clearAppCache(): Promise<{ success: boolean }>;

  /**
   * アプリを再起動
   */
  restartApp(): Promise<void>;
}

// プラグインの登録（実装は各プラットフォーム向けのネイティブコードで行う）
// モックバージョンを提供（開発用）
const ResetPluginMock: ResetPlugin = {
  resetAppData: async () => {
    console.log("Reset App Data called (mock)");
    // ここでresetAppData()を呼び出す
    return { success: true };
  },
  clearAppCache: async () => {
    console.log("Clear App Cache called (mock)");
    return { success: true };
  },
  restartApp: async () => {
    console.log("Restart App called (mock)");
    window.location.reload();
  },
};

export const Reset = registerPlugin<ResetPlugin>("Reset", {
  web: () => Promise.resolve(ResetPluginMock),
});
