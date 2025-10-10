import { useEffect, useState } from "react";
import { BuildModeChecker } from "./components/BuildModeChecker";
import { DebugResetButton } from "./components/DebugResetButton";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import PlansPage from "./components/PlansPage";
import ReadingPage from "./components/ReadingPage";
import SalonPage from "./components/SalonPage";
import TarotistPage from "./components/TarotistPage";
import { useAuth } from "./lib/hooks/useAuth";
import { useClient } from "./lib/hooks/useClient";
import { useLifecycle } from "./lib/hooks/useLifecycle";
import { useMaster } from "./lib/hooks/useMaster";
import { useUsage } from "./lib/hooks/useUsage";
import TarotSplashScreen from "./splashscreen";
import type { PageType, UserPlan } from "./types";

function App() {
  const [pageType, setPageType] = useState<PageType>("salon");
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [readingData, setReadingData] = useState<{
    spreadId: string;
    categoryId: string;
  } | null>(null);

  // 🔥 ライフサイクル管理
  const {
    isInitialized,
    isRefreshing,
    dateChanged,
    error,
    init,
    setup,
    cleanup,
    clearDateChanged,
    clearError,
  } = useLifecycle();

  // 🔥 認証状態
  const {
    payload,
    isReady: authIsReady,
    isAuthenticated,
    login: authLogin,
    logout: authLogout,
  } = useAuth();

  // 🔥 クライアント情報
  const { planCode, userId, clientId, changePlan } = useClient();

  // 🔥 マスターデータ取得
  // 条件: lifecycle.init()完了 && auth.isReady
  const { masterData, isLoading: isMasterLoading } = useMaster(
    isInitialized && authIsReady
  );

  // 🔥 利用状況取得
  // 条件: lifecycle.init()完了 && auth.isReady && clientIdあり
  const { usage: usageStats, isLoading: isUsageLoading } = useUsage(
    isInitialized && authIsReady && !!clientId
  );

  // 🔥 初期化処理
  useEffect(() => {
    console.log("[App] 初期化開始");

    init().then(() => {
      console.log("[App] 初期化完了");
      setup();
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

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      console.log("ログイン開始");

      await authLogin();
      console.log("ログイン成功");
    } catch (err) {
      console.error("ログイン失敗:", err);
      alert(err instanceof Error ? err.message : "ログインに失敗しました");
      sessionStorage.removeItem("pendingUpgrade");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log("ログアウト開始");
      await authLogout();
      console.log("ログアウト成功");

      setPageType("salon");
      setReadingData(null);
    } catch (err) {
      console.error("ログアウトエラー:", err);
    }
  };

  const handlePlanChange = async (newPlan: UserPlan) => {
    console.log(`プラン変更リクエスト: ${planCode} → ${newPlan}`);

    if ((newPlan === "STANDARD" || newPlan === "PREMIUM") && !isAuthenticated) {
      console.log("認証が必要です。");
      alert("このプランにはログインが必要です");
      return;
    }

    try {
      await changePlan(newPlan);
      console.log("プラン変更成功");
    } catch (err) {
      console.error("プラン変更エラー:", err);
      alert(err instanceof Error ? err.message : "プラン変更に失敗しました");
    }
  };

  const handleUpgrade = (targetPlan: UserPlan) => {
    console.log(`アップグレードリクエスト: ${targetPlan}`);
    handlePlanChange(targetPlan);
  };

  const handleDowngrade = (targetPlan: UserPlan) => {
    console.log(`ダウングレードリクエスト: ${targetPlan}`);
    if (confirm(`本当に ${targetPlan} プランにダウングレードしますか?`)) {
      handlePlanChange(targetPlan);
    }
  };

  const handlePageChange = (page: PageType) => {
    console.log("ページ変更:", page);
    setPageType(page);
  };

  const handleStartReading = (spreadId: string, categoryId: string) => {
    console.log(`占い開始: spread=${spreadId}, category=${categoryId}`);
    setReadingData({ spreadId, categoryId });
    setPageType("reading");
  };

  const handleBackFromReading = () => {
    console.log("占いから戻る");
    setReadingData(null);
    setPageType("salon");
  };

  // 🔥 サインイン完了後の自動アップグレード処理
  useEffect(() => {
    if (isAuthenticated && isInitialized) {
      console.log(
        `[App] サインイン検出 - 現在のプラン: ${planCode}, ユーザーID: ${userId}`
      );

      const pendingUpgrade = sessionStorage.getItem("pendingUpgrade");
      if (pendingUpgrade && pendingUpgrade !== planCode) {
        console.log(`[App] 保留中のアップグレードを実行: ${pendingUpgrade}`);
        sessionStorage.removeItem("pendingUpgrade");
        handlePlanChange(pendingUpgrade as UserPlan);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isInitialized, planCode, userId]);

  // 🔥 起動シーケンスのデバッグログ
  useEffect(() => {
    console.log("[App] Startup Status:", {
      isInitialized,
      authIsReady,
      clientId,
      isMasterLoading,
      isUsageLoading,
      hasMasterData: !!masterData,
      hasUsageStats: !!usageStats,
      hasPayload: !!payload,
    });
  }, [
    isInitialized,
    authIsReady,
    clientId,
    isMasterLoading,
    isUsageLoading,
    masterData,
    usageStats,
    payload,
  ]);

  // 初期化中またはデータロード中
  if (
    !isInitialized ||
    !authIsReady ||
    isMasterLoading ||
    isUsageLoading ||
    !masterData ||
    !usageStats ||
    !payload
  ) {
    return (
      <TarotSplashScreen
        message={
          !isInitialized
            ? "アプリを初期化中..."
            : !authIsReady
            ? "認証情報を確認中..."
            : isMasterLoading
            ? "マスターデータを読み込み中..."
            : isUsageLoading
            ? "利用状況を読み込み中..."
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

  // 初期化完了後もpayloadがない場合（異常系）
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
            isAuthenticated={isAuthenticated}
            masterData={masterData}
            usageStats={usageStats}
            onLogin={handleLogin}
            onUpgrade={handleUpgrade}
            onDowngrade={handleDowngrade}
            onStartReading={handleStartReading}
            isLoggingIn={isLoggingIn}
          />
        );
      case "reading":
        return (
          <ReadingPage
            payload={payload}
            masterData={masterData}
            spreadId={readingData?.spreadId || ""}
            categoryId={readingData?.categoryId || ""}
            onBack={handleBackFromReading}
          />
        );
      case "plans":
        return (
          <PlansPage
            payload={payload}
            isAuthenticated={isAuthenticated}
            masterData={masterData}
            onLogin={handleLogin}
            onChangePlan={handlePlanChange}
            isLoggingIn={isLoggingIn}
          />
        );
      case "tarotist":
        return (
          <TarotistPage
            payload={payload}
            isAuthenticated={isAuthenticated}
            masterData={masterData}
            onLogin={handleLogin}
            onUpgrade={handleUpgrade}
            isLoggingIn={isLoggingIn}
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
              <DebugResetButton />

              {isAuthenticated && (
                <div className="mt-8">
                  <button
                    onClick={handleLogout}
                    className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    ログアウト
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
            isAuthenticated={isAuthenticated}
            masterData={masterData}
            usageStats={usageStats}
            onLogin={handleLogin}
            onUpgrade={handleUpgrade}
            onDowngrade={handleDowngrade}
            onStartReading={handleStartReading}
            isLoggingIn={isLoggingIn}
          />
        );
    }
  };

  return (
    <div className="w-full" style={{ height: "100vh" }}>
      {/* 🔥 リフレッシュ中インジケーター */}
      {isRefreshing && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50 bg-purple-600 text-white px-4 py-2 rounded-full text-xs shadow-lg">
          🔄 更新中...
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

      {/* ビルドモードチェッカー */}
      <BuildModeChecker />

      <Header currentPlan={planCode as UserPlan} currentPage={pageType} />

      {/* 開発メニュー */}
      <div className="fixed top-2 right-2 z-50">
        <button
          onClick={() => setDevMenuOpen(!devMenuOpen)}
          className="w-6 h-6 bg-black bg-opacity-20 hover:bg-opacity-40 rounded-full text-xs text-white flex items-center justify-center transition-all opacity-30 hover:opacity-80"
          title="開発メニュー"
        >
          ⚙
        </button>

        {devMenuOpen && (
          <div className="absolute top-8 right-0 bg-white bg-opacity-95 backdrop-blur-sm p-2 rounded shadow-lg border">
            <div className="text-xs mb-2 text-gray-600">プラン切替</div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  handlePlanChange("FREE");
                  setDevMenuOpen(false);
                  setPageType("salon");
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  planCode === "FREE"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                Free
              </button>
              <button
                onClick={() => {
                  handlePlanChange("STANDARD");
                  setDevMenuOpen(false);
                  setPageType("salon");
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  planCode === "STANDARD"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                💎 Standard
              </button>
              <button
                onClick={() => {
                  handlePlanChange("PREMIUM");
                  setDevMenuOpen(false);
                  setPageType("salon");
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  planCode === "PREMIUM"
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
            </div>
          </div>
        )}
      </div>

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
