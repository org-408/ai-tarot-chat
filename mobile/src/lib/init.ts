import { storeRepository } from "./repositories/store";

/**
 * アプリ起動時の初期化
 */
export async function initializeApp() {
  try {
    // 1) Store初期化
    console.log("Store初期化開始");
    await storeRepository.init();
    console.log("Store初期化完了");

    // 2) Database初期化（マイグレーション含む）
    // await databaseRepository.init();

    console.log("App initialized successfully");
  } catch (error) {
    console.error("Failed to initialize app:", error);
    throw error;
  }
}
