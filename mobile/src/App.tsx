import { useEffect, useState } from "react";
import type {
  Plan,
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../shared/lib/types";
import { DebugResetButton } from "./components/DebugResetButton";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import PlansPage from "./components/PlansPage";
import ReadingPage from "./components/ReadingPage";
import SalonPage from "./components/SalonPage";
import TarotistPage from "./components/TarotistPage";
import TarotistSwipePage from "./components/TarotistSwipePage";
import { useAuth } from "./lib/hooks/useAuth";
import { useClient } from "./lib/hooks/useClient";
import { useLifecycle } from "./lib/hooks/useLifecycle";
import { useMaster } from "./lib/hooks/useMaster";
import TarotSplashScreen from "./splashscreen";
import type { PageType, UserPlan } from "./types";

function App() {
  // ✅ デバッグメニュー有効化フラグ
  const isDebugEnabled = import.meta.env.VITE_ENABLE_DEBUG_MENU === "true";

  const [pageType, setPageType] = useState<PageType>("salon");
  const [devMenuOpen, setDevMenuOpen] = useState(false);

  const [readingData, setReadingData] = useState<{
    tarotist: Tarotist;
    spread: Spread;
    category: ReadingCategory;
  } | null>(null);

  // 🔥 ライフサイクル管理（✅ デバッグ情報追加）
  const {
    isInitialized,
    isRefreshing,
    dateChanged,
    error,
    currentInitStep,
    currentResumeStep,
    isOffline,
    offlineMode,
    lastError,
    isChangingPlan,
    planChangeError,
    init,
    setup,
    cleanup,
    clearDateChanged,
    clearError,
    getInitStepLabel,
    getResumeStepLabel,
    getOfflineModeLabel,
    login: appLogin,
    logout: appLogout,
    changePlan,
  } = useLifecycle();

  // 🔥 認証状態
  const { payload, isReady: authIsReady, isAuthenticated } = useAuth();

  // 🔥 クライアント情報（changePlanで全て管理）
  const {
    isReady: clientIsReady,
    usage: usageStats,
    currentPlan,
  } = useClient();

  // 🔥 マスターデータ取得
  // ✅ 修正: 条件なしで呼び出し（lifecycle.tsがinit()を管理）
  const { masterData, plans, isLoading: isMasterLoading } = useMaster();

  // 🔥 初期化処理
  useEffect(() => {
    console.log("[App] 初期化開始");

    console.log("[App] init 開始");
    init().then(() => {
      console.log("[App] init 完了");
      console.log("[App] setup 開始");
      setup();
      console.log("[App] setup 完了");
      console.log("[App] 初期化完了");
    });

    return () => {
      cleanup();
      console.log("[App] クリーンアップ完了");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔥 日付変更時の通知表示
  useEffect(() => {
    if (dateChanged) {
      console.log("[App] 日付が変わりました");
      setTimeout(() => {
        clearDateChanged();
      }, 3000);
    }
  }, [dateChanged, clearDateChanged]);

  // 🔥 エラーハンドリング
  useEffect(() => {
    if (error) {
      console.error("[App] Lifecycle error:", error);
      setTimeout(() => {
        clearError();
      }, 5000);
    }
  }, [error, clearError]);

  // 🔥 プラン変更エラーハンドリング
  useEffect(() => {
    if (planChangeError) {
      console.error("[App] Plan change error:", planChangeError);
    }
  }, [planChangeError]);

  const handleLogin = async () => {
    try {
      console.log("ログイン開始");
      await appLogin();
      console.log("ログイン成功");

      setReadingData(null);
    } catch (err) {
      console.error("ログインエラー:", err);
    }
  };

  // 🔥 ログアウト処理
  const handleLogout = async () => {
    try {
      console.log("ログアウト開始");
      await appLogout();
      console.log("ログアウト成功");

      setPageType("salon");
      setReadingData(null);
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
      // changePlanが全てを処理（サインインが必要な場合も内部で処理）
      await changePlan(getPlan(newPlan)!);
      console.log("プラン変更成功");
    } catch (err) {
      console.error("プラン変更エラー:", err);
      // エラーは planChangeError で処理されるため、ここでは何もしない
    }
  };

  // 🔥 ページ変更
  const handlePageChange = (page: PageType) => {
    console.log("ページ変更:", page);
    setPageType(page);
  };

  // 🔥 占い開始
  const handleStartReading = (
    tarotist: Tarotist,
    spread: Spread,
    category: ReadingCategory
  ) => {
    console.log(`占い開始: spread=${spread}, category=${category}`);
    setReadingData({ tarotist, spread, category });
    setPageType("reading");
  };

  // 🔥 占いから戻る
  const handleBackFromReading = () => {
    console.log("占いから戻る");
    setReadingData(null);
    setPageType("salon");
  };

  // 🔥 起動シーケンスのデバッグログ
  useEffect(() => {
    console.log("[App] Startup Status:", {
      isInitialized,
      authIsReady,
      isMasterLoading,
      hasMasterData: !!masterData,
      hasPayload: !!payload,
      isChangingPlan,
    });
  }, [
    isInitialized,
    authIsReady,
    isMasterLoading,
    masterData,
    payload,
    isChangingPlan,
  ]);

  // 初期化中またはデータロード中
  if (
    !isInitialized ||
    !authIsReady ||
    !clientIsReady ||
    isMasterLoading ||
    !masterData ||
    !usageStats ||
    !payload
  ) {
    return (
      <TarotSplashScreen
        message={
          !isInitialized
            ? getInitStepLabel()
            : !authIsReady
            ? "認証情報を確認中..."
            : !clientIsReady
            ? "クライアント情報を取得中..."
            : isMasterLoading
            ? "マスターデータを読み込み中..."
            : !masterData
            ? "マスターデータを読み込み中..."
            : !usageStats
            ? "利用状況を読み込み中..."
            : !payload
            ? "ユーザーデータを読み込み中..."
            : "読み込み中..."
        }
      />
    );
  }

  // 初期化完了後もpayloadがない場合(異常系)
  if (!payload) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-xl font-bold mb-2">初期化エラー</div>
          <div className="text-sm opacity-80">アプリの初期化に失敗しました</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-white text-purple-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // ページレンダリング
  const renderPage = () => {
    switch (pageType) {
      case "salon":
        return (
          <SalonPage
            payload={payload}
            currentPlan={currentPlan!}
            masterData={masterData}
            usageStats={usageStats}
            onChangePlan={handleChangePlan}
            onStartReading={handleStartReading}
            isChangingPlan={isChangingPlan}
          />
        );
      case "reading":
        return (
          <ReadingPage
            payload={payload}
            masterData={masterData}
            readingData={readingData!}
            onBack={handleBackFromReading}
          />
        );
      case "plans":
        return (
          <PlansPage
            payload={payload}
            currentPlan={currentPlan!}
            masterData={masterData}
            onChangePlan={handleChangePlan}
            isChangingPlan={isChangingPlan}
          />
        );
      case "tarotist":
        return (
          <TarotistPage
            payload={payload}
            currentPlan={currentPlan!}
            masterData={masterData}
            onChangePlan={handleChangePlan}
            isChangingPlan={isChangingPlan}
          />
        );
      case "tarotistSwipe":
        return (
          <TarotistSwipePage
            payload={payload}
            currentPlan={currentPlan!}
            masterData={masterData}
            onChangePlan={handleChangePlan}
            isChangingPlan={isChangingPlan}
          />
        );
      case "history":
        return (
          <div className="main-container">
            <div className="page-title">📋 履歴</div>
            <div className="text-center text-gray-500 mt-20">
              <div className="text-6xl mb-4">🚧</div>
              <div className="text-lg font-bold mb-2">準備中</div>
              <div className="text-sm">占い履歴機能を開発中です</div>
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="main-container">
            <div className="page-title">⚙️ 設定</div>
            <div className="text-center text-gray-500 mt-20">
              <div className="text-6xl mb-4">🚧</div>
              <div className="text-lg font-bold mb-2">準備中</div>
              <div className="text-sm">設定機能を開発中です</div>

              {isAuthenticated ? (
                <div className="mt-8">
                  <button
                    onClick={handleLogout}
                    className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    サインアウト
                  </button>
                </div>
              ) : (
                <div className="mt-8">
                  <button
                    onClick={handleLogin}
                    className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    サインイン
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return (
          <SalonPage
            payload={payload}
            currentPlan={currentPlan!}
            masterData={masterData}
            usageStats={usageStats}
            onChangePlan={handleChangePlan}
            onStartReading={handleStartReading}
            isChangingPlan={isChangingPlan}
          />
        );
    }
  };

  return (
    <div className="w-full" style={{ height: "100vh" }}>
      {/* 🔥 プラン変更中インジケーター */}
      {isChangingPlan && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 bg-purple-600 text-white px-4 py-2 rounded-full text-xs shadow-lg">
          🔄 処理中...
        </div>
      )}

      {/* 🔥 リフレッシュ中インジケーター */}
      {isRefreshing && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 bg-purple-600 text-white px-4 py-2 rounded-full text-xs shadow-lg">
          🔄 {getResumeStepLabel()}
        </div>
      )}

      {/* ✅ オフライン通知 */}
      {isOffline && offlineMode === "limited" && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-600 text-white px-4 py-2 rounded-full text-xs shadow-lg">
          📡 {getOfflineModeLabel()}
        </div>
      )}

      {/* ✅ 完全オフライン警告 */}
      {offlineMode === "full" && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-full text-xs shadow-lg">
          ⚠️ オフライン - 初回起動にはネット接続が必要です
        </div>
      )}

      {/* 🔥 日付変更通知 */}
      {dateChanged && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-full text-xs shadow-lg">
          ✨ 新しい日になりました!
        </div>
      )}

      {/* 🔥 エラー通知 */}
      {error && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-full text-xs shadow-lg">
          ⚠️ {error.message}
        </div>
      )}

      <Header
        currentPlan={currentPlan!.code as UserPlan}
        currentPage={pageType}
      />

      {/* 開発メニュー（環境変数で制御） */}
      {isDebugEnabled && (
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
              {/* ✅ デバッグ情報セクション */}
              <div className="text-xs mb-2 pb-2 border-b">
                <div className="font-bold text-gray-700 mb-1">
                  🔧 システム状態
                </div>
                <div className="space-y-0.5 text-gray-600">
                  <div>
                    Init:{" "}
                    <span className="text-purple-600">{currentInitStep}</span>
                  </div>
                  <div>
                    Resume:{" "}
                    <span className="text-purple-600">{currentResumeStep}</span>
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

              {/* 既存のプラン切り替えセクション */}
              <div className="text-xs mb-2 text-gray-600">プラン切替</div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    handleChangePlan("FREE");
                    setDevMenuOpen(false);
                    setPageType("salon");
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
                    setPageType("salon");
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
                    setPageType("salon");
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
                    setPageType("plans");
                  }}
                  className="px-2 py-1 text-xs rounded transition-colors bg-purple-200 hover:bg-purple-300"
                >
                  💎 Plan
                </button>
                <button
                  onClick={() => {
                    setDevMenuOpen(false);
                    setPageType("tarotist");
                  }}
                  className="px-2 py-1 text-xs rounded transition-colors bg-purple-200 hover:bg-purple-300"
                >
                  🔮 Tarotist
                </button>
                <button
                  onClick={() => {
                    setDevMenuOpen(false);
                    setPageType("tarotistSwipe");
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
                      handleChangePlan("FREE");
                      setDevMenuOpen(false);
                    }}
                    className="px-2 py-1 text-xs rounded transition-colors bg-blue-200 hover:bg-blue-300"
                  >
                    🔐 Login
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ユーザー情報表示 */}
      {payload.user && (
        <div className="fixed top-2 left-2 z-40 bg-black bg-opacity-10 text-xs px-2 py-1 rounded opacity-30 hover:opacity-80 transition-all">
          {payload.user.email}
        </div>
      )}

      <div
        className="main-content-area"
        style={pageType === "salon" ? { paddingBottom: "105px" } : {}}
      >
        {renderPage()}
      </div>

      <Navigation currentPage={pageType} onPageChange={handlePageChange} />
    </div>
  );
}

export default App;
