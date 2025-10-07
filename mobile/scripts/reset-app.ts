import { resetAppData } from "../src/lib/utils/resetApp";

/**
 * コマンドラインからアプリデータをリセットするスクリプト
 */
async function main() {
  console.log("🔄 AI Tarot Chat データリセットツール");
  console.log("------------------------------------");

  try {
    console.log("リセット処理を実行中...");
    await resetAppData();
    console.log("✅ データリセット完了");
    process.exit(0);
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    process.exit(1);
  }
}

// スクリプトとして実行された場合のみ実行
if (require.main === module) {
  main();
}
