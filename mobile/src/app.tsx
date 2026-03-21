import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type {
  Plan,
  ReadingCategory,
  Spread,
  Tarotist,
} from "../../shared/lib/types";
import { DebugMenu } from "./components/debug-menu";
import Header from "./components/header";
import PlansPage from "./components/plans-page";
import ReadingPage from "./components/reading-page";
import SalonPage from "./components/salon-page";
import SettingsPage from "./components/settings-page";
import SidebarMenu from "./components/sidebar-menu";
import SwipeableDemo from "./components/swipeable-demo";
import TarotistPage from "./components/tarotist-page";
import TarotistSwipePage from "./components/tarotist-swipe-page";
import { useAuth } from "./lib/hooks/use-auth";
import { useClient } from "./lib/hooks/use-client";
import { useLifecycle } from "./lib/hooks/use-lifecycle";
import { useMaster } from "./lib/hooks/use-master";
import { useSubscription } from "./lib/hooks/use-subscription";
import TarotSplashScreen from "./splashscreen";
import type { PageType, UserPlan } from "./types";

function App() {
  // ✅ デバッグメニュー有効化フラグ
  const isDebugEnabled = import.meta.env.VITE_ENABLE_DEBUG_MENU === "true";

  const [pageType, setPageType] = useState<PageType>("salon");
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // 🔥 サイドバー状態

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
    isOffline,
    offlineMode,
    isChangingPlan,
    planChangeError,
    init,
    cleanup,
    clearDateChanged,
    clearError,
    getStepLabel,
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
    refreshUsage,
  } = useClient();

  const { openManage } = useSubscription();

  // 🔥 マスターデータ取得
  // ✅ 修正: 条件なしで呼び出し（lifecycle.tsがinit()を管理）
  const { masterData, plans, isLoading: isMasterLoading } = useMaster();

  // 🔥 初期化処理
  useEffect(() => {
    console.log("[App] 初期化開始");

    console.log("[App] init 開始");
    init().then(() => {
      console.log("[App] init 完了");
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

  // 🔥 左端から右スワイプでサイドバーを開く
  useEffect(() => {
    let startX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      // 左端20px以内から始まり、50px以上右にスワイプしたら開く
      // 占い進行中はサイドバーを開かない
      if (startX < 20 && endX - startX > 50 && !sidebarOpen && pageType !== "reading") {
        setSidebarOpen(true);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [sidebarOpen]);

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

  // 🔥 RevenueCat Customer Center へ移動
  const handleManageSubscriptions = async () => {
    console.log("Customer Center へ移動");
    await openManage();
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

  // 🔥 ページ変更（サイドバー等からの任意ナビゲーション）
  const handlePageChange = (page: PageType) => {
    // ReadingPage 中はナビゲーションをブロック
    if (pageType === "reading") {
      console.log("ページ変更をブロック: 占い進行中");
      return;
    }
    console.log("ページ変更:", page);
    setPageType(page);
  };

  // 🔥 占い開始
  const handleStartReading = () => {
    console.log(`占い開始: `);
    setPageType("reading");
  };

  // 🔥 占いから戻る（戻るボタン）
  const handleBackFromReading = () => {
    console.log("占いから戻る");
    setReadingData(null);
    refreshUsage().catch((e) => console.warn("refreshUsage failed on back", e));
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

  // 占い師プロフィールダイアログ管理
  const [showProfile, setShowProfile] = useState(false);

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
            ? getStepLabel() // lifecycle の currentStep に対応したラベルを表示
            : !authIsReady
            ? "認証情報を確認中... (1/4)"
            : !clientIsReady
            ? "利用状況を取得中... (3/4)"
            : isMasterLoading || !masterData
            ? "データを読み込み中... (4/4)"
            : !usageStats
            ? "利用状況を取得中... (3/4)"
            : !payload
            ? "認証情報を確認中... (1/4)"
            : "準備完了"
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
            showProfile={showProfile}
            setShowProfile={setShowProfile}
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
      case "swipeableDemo":
        return (
          <SwipeableDemo
            payload={payload}
            masterData={masterData}
            usageStats={usageStats}
            currentPlan={currentPlan!}
            onChangePlan={handleChangePlan}
            isChangingPlan={isChangingPlan}
          />
        );
      case "history":
        return (
          <div className="main-container">
            <div className="page-title pt-3">📋 履歴</div>
            <div className="text-center text-gray-500 mt-20">
              <div className="text-6xl mb-4">🚧</div>
              <div className="text-lg font-bold mb-2">準備中</div>
              <div className="text-sm">占い履歴機能を開発中です</div>
            </div>
          </div>
        );
      case "settings":
        return (
          <SettingsPage
            isAuthenticated={isAuthenticated}
            userEmail={payload.user?.email}
            currentPlan={currentPlan!}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onManageSubscriptions={handleManageSubscriptions}
          />
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
      {/* 🔥 サイドバーメニュー */}
      <SidebarMenu
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentPage={pageType}
        onPageChange={handlePageChange}
        currentPlan={currentPlan?.code || "GUEST"}
        userEmail={payload.user?.email}
      />

      {/* 🔥 プラン変更中インジケーター */}
      <AnimatePresence>
        {isChangingPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
              className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center border border-purple-100/50 relative overflow-hidden"
              style={{
                minWidth: "340px",
                maxWidth: "90vw",
              }}
            >
              {/* 背景装飾 - アニメーション付き */}
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
              />
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
                className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"
              />

              {/* スピナー */}
              <div className="relative mb-5">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.7, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full blur-md"
                />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="relative w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg"
                >
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v1a7 7 0 00-7 7h1z"
                    />
                  </svg>
                </motion.div>
              </div>

              {/* テキスト - ふわっと表示 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="relative z-10"
              >
                <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  プラン変更中
                </div>
                <div className="text-sm text-gray-600 text-center leading-relaxed">
                  プランの切り替えを行っています
                  <br />
                  <span className="text-purple-500 font-medium">
                    このままお待ちください
                  </span>
                </div>
              </motion.div>

              {/* プログレスバー */}
              <div className="w-full h-1 bg-gray-200 rounded-full mt-6 overflow-hidden relative z-10">
                <motion.div
                  animate={{
                    x: ["-100%", "300%"],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 rounded-full"
                  style={{ width: "40%" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔥 リフレッシュ中インジケーター */}
      {isRefreshing && (
        <div className="fixed top-28 left-1/2 transform -translate-x-1/2 z-50 bg-purple-600 text-white p-2 rounded-full text-xs shadow-lg">
          🔄 {getStepLabel()}
        </div>
      )}
      {/* ✅ オフライン通知 */}
      {isOffline && offlineMode === "limited" && (
        <div className="fixed top-28 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-600 text-white p-2 rounded-full text-xs shadow-lg">
          📡 {getOfflineModeLabel()}
        </div>
      )}
      {/* ✅ 完全オフライン警告 */}
      {offlineMode === "full" && (
        <div className="fixed top-28 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white p-2 rounded-full text-xs shadow-lg">
          ⚠️ オフライン - 初回起動にはネット接続が必要です
        </div>
      )}
      {/* 🔥 日付変更通知 */}
      {dateChanged && (
        <div className="fixed top-28 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white p-2 rounded-full text-xs shadow-lg">
          ✨ 新しい日になりました!
        </div>
      )}
      {/* 🔥 エラー通知 */}
      {error && (
        <div className="fixed top-28 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white p-2 rounded-full text-xs shadow-lg">
          ⚠️ {error.message}
        </div>
      )}
      <Header
        currentPlan={currentPlan!.code as UserPlan}
        currentPage={pageType}
        onMenuClick={() => setSidebarOpen(true)}
        menuDisabled={pageType === "reading"}
        showProfile={showProfile}
        setShowProfile={setShowProfile}
      />
      {/* 開発メニュー（環境変数で制御） */}
      {isDebugEnabled && (
        <DebugMenu
          devMenuOpen={devMenuOpen}
          setDevMenuOpen={setDevMenuOpen}
          setPageType={setPageType}
        />
      )}

      {/* ユーザー情報表示 */}
      {payload.user && (
        <div className="fixed top-2 left-2 z-40 bg-black bg-opacity-10 text-xs px-2 py-1 rounded opacity-30 hover:opacity-80 transition-all">
          {payload.user.email}
        </div>
      )}
      <div className="main-content-area">{renderPage()}</div>
    </div>
  );
}

export default App;
