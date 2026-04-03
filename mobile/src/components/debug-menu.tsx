import JsonView from "@uiw/react-json-view";
import type { Plan } from "../../../shared/lib/types";
import { useAuth } from "../lib/hooks/use-auth";
import { useClient } from "../lib/hooks/use-client";
import { useLifecycle } from "../lib/hooks/use-lifecycle";
import { useMaster } from "../lib/hooks/use-master";
import { useSubscription } from "../lib/hooks/use-subscription";
import type { PageType, UserPlan } from "../types";
import { DebugResetButton } from "./debug-reset-button";

interface DebugMenuProps {
  devMenuOpen: boolean;
  setDevMenuOpen: (open: boolean) => void;
  setPageType?: React.Dispatch<React.SetStateAction<PageType>>;
}

export const DebugMenu: React.FC<DebugMenuProps> = ({
  devMenuOpen,
  setDevMenuOpen,
  setPageType,
}) => {
  const lifecycle = useLifecycle();
  const {
    currentStep,
    isOffline,
    offlineMode,
    lastError,
    login: appLogin,
    logout: appLogout,
    changePlan,
  } = lifecycle;

  const auth = useAuth();
  const { isReady: authIsReady, isAuthenticated } = auth;

  const client = useClient();
  const { isReady: clientIsReady, currentPlan, debugSetPlan } = client;

  const master = useMaster();
  const { masterData, plans } = master;

  const subscription = useSubscription();

  const handleLogin = async () => {
    try {
      console.log("ログイン開始");
      await appLogin();
      console.log("ログイン成功");
    } catch (err) {
      console.error("ログインエラー:", err);
    }
  };

  const handleSetPageType = (pageType: PageType) => {
    if (setPageType) {
      setPageType(pageType);
    }
  };

  // 🔥 ログアウト処理
  const handleLogout = async () => {
    try {
      console.log("ログアウト開始");
      await appLogout();
      console.log("ログアウト成功");

      handleSetPageType("salon");
    } catch (err) {
      console.error("ログアウトエラー:", err);
    }
  };

  const getPlan = (code: string): Plan | null => {
    return plans.find((p) => p.code === code) || null;
  };

  // 🔥 プラン変更処理（サインインも含む）
  const handleChangePlan = async (newPlan: UserPlan) => {
    console.log(`プラン変更リクエスト: ${currentPlan?.code} → ${newPlan}`);

    try {
      const targetPlan = getPlan(newPlan);
      if (!targetPlan) return;

      if (import.meta.env.VITE_DEBUG_MODE === "true") {
        debugSetPlan(targetPlan);
        console.log("デバッグ用プラン変更成功");
        return;
      }

      // changePlanが全てを処理（サインインが必要な場合も内部で処理）
      await changePlan(targetPlan);
      console.log("プラン変更成功");
    } catch (err) {
      console.error("プラン変更エラー:", err);
      // エラーは planChangeError で処理されるため、ここでは何もしない
    }
  };
  return (
    <>
      <div className="fixed top-16 right-2 z-50">
        <button
          onClick={() => setDevMenuOpen(!devMenuOpen)}
          className="w-6 h-6 bg-black bg-opacity-20 hover:bg-opacity-40 rounded-full text-xs text-white flex items-center justify-center transition-all opacity-30 hover:opacity-80"
          title="開発メニュー"
        >
          ⚙
        </button>

        {devMenuOpen && (
          <div className="absolute top-8 right-0 w-64 bg-white bg-opacity-95 backdrop-blur-sm p-2 rounded shadow-lg border max-h-[80vh] overflow-y-auto">
            {/* 環境情報セクション */}
            <div className="text-xs mb-2 pb-2 border-b">
              <div className="font-bold text-gray-700 mb-1">🌐 環境</div>
              <div className="text-gray-600 break-all">
                {import.meta.env.VITE_BFF_URL || "http://localhost:3000"}
              </div>
            </div>

            {/* ✅ デバッグ情報セクション */}
            <div className="text-xs mb-2 pb-2 border-b">
              <div className="font-bold text-gray-700 mb-1">
                🔧 システム状態
              </div>
              <div className="space-y-0.5 text-gray-600">
                <div>
                  Init: <span className="text-purple-600">{currentStep}</span>
                </div>
                <div>
                  Resume: <span className="text-purple-600">{currentStep}</span>
                </div>
                <div>
                  Offline:{" "}
                  <span
                    className={isOffline ? "text-red-600" : "text-green-600"}
                  >
                    {isOffline ? "YES" : "NO"} ({offlineMode})
                  </span>
                </div>
                <div className="flex gap-2">
                  <span>Auth: {authIsReady ? "✓" : "⏳"}</span>
                  <span>Client: {clientIsReady ? "✓" : "⏳"}</span>
                  <span>Master: {masterData ? "✓" : "⏳"}</span>
                </div>
                {lastError && (
                  <div className="text-red-500 text-[10px] mt-1">
                    Error@{lastError.step}:{" "}
                    {lastError.error.message.substring(0, 40)}...
                  </div>
                )}
              </div>
            </div>

            {/* ストア状態セクション */}
            <div className="text-xs mb-2 pb-2 border-b">
              <div className="font-bold text-gray-700 mb-1">🔧 ストア状態</div>
              <div className="space-y-0.5 text-gray-600">
                <div>
                  lifecycle: <JsonView value={lifecycle} collapsed={true} />
                </div>
                <div>
                  auth: <JsonView value={auth} collapsed={true} />
                </div>
                <div>
                  client: <JsonView value={client} collapsed={true} />
                </div>
                <div>
                  subscription:{" "}
                  <JsonView value={subscription} collapsed={true} />
                </div>
                <div>
                  master: <JsonView value={master} collapsed={true} />
                </div>
              </div>
            </div>

            {/* 既存のプラン切り替えセクション */}
            <div className="text-xs mb-2 text-gray-600">プラン切替</div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  handleChangePlan("FREE");
                  setDevMenuOpen(false);
                  handleSetPageType("salon");
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  currentPlan!.code === "FREE"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                Free
              </button>
              <button
                onClick={() => {
                  handleChangePlan("STANDARD");
                  setDevMenuOpen(false);
                  handleSetPageType("salon");
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  currentPlan!.code === "STANDARD"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                💎 Standard
              </button>
              <button
                onClick={() => {
                  handleChangePlan("PREMIUM");
                  setDevMenuOpen(false);
                  handleSetPageType("salon");
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  currentPlan!.code === "PREMIUM"
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                👑 Premium
              </button>
              <button
                onClick={() => {
                  setDevMenuOpen(false);
                  handleSetPageType("plans");
                }}
                className="px-2 py-1 text-xs rounded transition-colors bg-purple-200 hover:bg-purple-300"
              >
                💎 Plan
              </button>
              <button
                onClick={() => {
                  setDevMenuOpen(false);
                  handleSetPageType("tarotist");
                }}
                className="px-2 py-1 text-xs rounded transition-colors bg-purple-200 hover:bg-purple-300"
              >
                🔮 Tarotist
              </button>
              <button
                onClick={() => {
                  setDevMenuOpen(false);
                  handleSetPageType("tarotistSwipe");
                }}
                className="px-2 py-1 text-xs rounded transition-colors bg-purple-200 hover:bg-purple-300"
              >
                🔮 TarotistSwipe
              </button>
              <DebugResetButton />
              <hr className="my-1 border-gray-300" />
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    handleLogout();
                    setDevMenuOpen(false);
                  }}
                  className="px-2 py-1 text-xs rounded transition-colors bg-red-200 hover:bg-red-300"
                >
                  🚪 Logout
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleLogin();
                    setDevMenuOpen(false);
                  }}
                  className="px-2 py-1 text-xs rounded transition-colors bg-blue-200 hover:bg-blue-300"
                >
                  🔐 Login
                </button>
              )}
              <hr className="my-1 border-gray-300" />
              <button
                onClick={() => setDevMenuOpen(false)}
                className="px-2 py-1 text-xs rounded transition-colors bg-gray-200 hover:bg-gray-300"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
