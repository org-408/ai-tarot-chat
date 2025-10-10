import { useState } from "react";

/**
 * ビルドモード確認コンポーネント
 * 開発時のみ表示、画面右下に小さく表示
 */
export function BuildModeChecker() {
  const [showDetails, setShowDetails] = useState(false);

  const mode = import.meta.env.MODE;
  const isDev = import.meta.env.DEV;
  const isProd = import.meta.env.PROD;

  // 本番環境では非表示にする（オプション）
  // if (isProd) return null;

  return (
    <>
      {/* 常時表示：小さなバッジ */}
      <div
        onClick={() => setShowDetails(!showDetails)}
        className="fixed bottom-2 right-2 z-[9999] cursor-pointer"
        style={{
          pointerEvents: "auto",
          touchAction: "manipulation",
        }}
      >
        <div
          className={`px-2 py-1 rounded text-[10px] font-mono font-bold shadow-lg ${
            isDev ? "bg-yellow-500 text-black" : "bg-green-600 text-white"
          }`}
        >
          {mode.toUpperCase()}
        </div>
      </div>

      {/* 詳細表示：タップで表示 */}
      {showDetails && (
        <div
          className="fixed inset-0 z-[9998] bg-black bg-opacity-50 flex items-center justify-center"
          onClick={() => setShowDetails(false)}
          style={{
            pointerEvents: "auto",
            touchAction: "manipulation",
          }}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-bold mb-4 text-gray-800">
              🔍 Build Mode Info
            </div>

            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-gray-600">MODE:</span>
                <span
                  className={`font-bold ${
                    isDev ? "text-yellow-600" : "text-green-600"
                  }`}
                >
                  {mode}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">DEV:</span>
                <span
                  className={`font-bold ${
                    isDev ? "text-yellow-600" : "text-gray-400"
                  }`}
                >
                  {String(isDev)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">PROD:</span>
                <span
                  className={`font-bold ${
                    isProd ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {String(isProd)}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  {isDev ? (
                    <>
                      ⚠️ Development Mode
                      <br />
                      StrictMode may be active
                    </>
                  ) : (
                    <>
                      ✅ Production Mode
                      <br />
                      StrictMode is disabled
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDetails(false)}
              className="mt-4 w-full py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
