import { IonAlert, IonButton } from "@ionic/react";
import React, { useState } from "react";
import { Reset } from "../lib/plugins/resetPlugin";
import { resetAppData } from "../lib/utils/resetApp";

/**
 * Capacitor専用のアプリデータリセットボタン
 * 開発環境またはデバッグ設定がオンの場合のみ表示
 */
export const DebugResetButton: React.FC = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 開発環境または特定の条件でのみ表示
  const isDebugMode =
    import.meta.env.NODE_ENV !== "production" ||
    localStorage.getItem("debug_mode") === "true";
  if (!isDebugMode) return null;

  const handleReset = async () => {
    try {
      setIsResetting(true);
      setError(null);

      // JS層のデータリセット
      await resetAppData();

      // ネイティブ層のキャッシュクリア（もし実装されていれば）
      try {
        await Reset.clearAppCache();
      } catch (e) {
        console.warn("Native cache clearing not available", e);
      }

      setResetComplete(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "不明なエラー";
      setError(errorMessage);
    } finally {
      setIsResetting(false);
    }
  };

  const handleRestart = async () => {
    try {
      // アプリを再起動（可能な場合）
      await Reset.restartApp();
    } catch (e) {
      // 再起動できない場合はリロード
      console.warn("App restart not available, reloading instead", e);
      window.location.reload();
    }
  };

  return (
    <>
      <IonButton
        color="danger"
        onClick={() => handleReset()}
        disabled={isResetting}
      >
        🔄 Debug: リセット
      </IonButton>

      <IonAlert
        isOpen={showAlert}
        header="アプリデータのリセット"
        message={
          resetComplete
            ? "✅ リセット完了。アプリを再起動してください。"
            : "全てのアプリデータをリセットします。この操作は元に戻せません。続行しますか？"
        }
        buttons={
          resetComplete
            ? [{ text: "再起動", handler: handleRestart }]
            : [
                { text: "キャンセル", role: "cancel" },
                { text: "リセット実行", handler: handleReset },
              ]
        }
        onDidDismiss={() => {
          if (!resetComplete) setShowAlert(false);
        }}
      />

      {error && (
        <IonAlert
          isOpen={!!error}
          header="エラー"
          message={error}
          buttons={[{ text: "OK" }]}
          onDidDismiss={() => setError(null)}
        />
      )}
    </>
  );
};
