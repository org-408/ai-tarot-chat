import { AnimatePresence, motion } from "framer-motion";
import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { Plan } from "../../shared/lib/types";
import Header from "./components/header";
import ReadingPage from "./components/reading-page";
import SidebarMenu from "./components/sidebar-menu";
import { useAuth } from "./lib/hooks/use-auth";
import { useClient } from "./lib/hooks/use-client";
import { useLifecycle } from "./lib/hooks/use-lifecycle";
import { useMaster } from "./lib/hooks/use-master";
import { useSalon } from "./lib/hooks/use-salon";
import { useSubscription } from "./lib/hooks/use-subscription";
import { showInterstitialAd } from "./lib/utils/admob";
import { canUseTarotist } from "./lib/utils/salon";
import TarotSplashScreen from "./splashscreen";
import type { PageType, UserPlan } from "./types";

import SalonPage from "./components/salon-page";

const loadPersonalPage = () => import("./components/personal-page");
const loadClaraPage = () => import("./components/clara-page");
const loadPlansPage = () => import("./components/plans-page");
const loadTarotistPage = () => import("./components/tarotist-page");
const loadTarotistSwipePage = () => import("./components/tarotist-swipe-page");
const loadSwipeableDemo = () => import("./components/swipeable-demo");
const loadHistoryPage = () => import("./components/history-page");
const loadSettingsPage = () => import("./components/settings-page");

const PersonalPage = lazy(loadPersonalPage);
const PlansPage = lazy(loadPlansPage);
const TarotistPage = lazy(loadTarotistPage);
const TarotistSwipePage = lazy(loadTarotistSwipePage);
const SwipeableDemo = lazy(loadSwipeableDemo);
const ClaraPage = lazy(loadClaraPage);
const HistoryPage = lazy(loadHistoryPage);
const SettingsPage = lazy(loadSettingsPage);
const DebugMenu = lazy(() =>
  import("./components/debug-menu").then((module) => ({
    default: module.DebugMenu,
  })),
);

// ─────────────────────────────────────────────
// プラン失効通知コンポーネント
// ─────────────────────────────────────────────

const PlanExpiredToast: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-28 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-2xl shadow-lg text-sm font-medium whitespace-nowrap"
    >
      <span>⚠️</span>
      <span>プランが変更されました。ご利用のプランをご確認ください。</span>
    </motion.div>
  );
};

const PlanExpiredDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-6"
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center gap-4"
    >
      <div className="text-4xl">⚠️</div>
      <div className="text-center">
        <p className="font-bold text-gray-800 text-lg mb-1">
          プランが変更されました
        </p>
        <p className="text-sm text-gray-500 leading-relaxed">
          ご利用のプランが変更されたため、占いを終了します。
          <br />
          プランの詳細はプラン画面でご確認ください。
        </p>
      </div>
      <button
        onClick={onClose}
        className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl active:opacity-80"
      >
        OK
      </button>
    </motion.div>
  </motion.div>
);

const PageFallback: React.FC = () => (
  <div className="flex min-h-full items-center justify-center px-6 py-12">
    <div className="rounded-2xl bg-white/85 px-5 py-3 text-sm font-medium text-gray-600 shadow-lg backdrop-blur-sm">
      読み込み中...
    </div>
  </div>
);

function App() {
  // ✅ デバッグモードフラグ（本番は false に設定）
  const isDebugEnabled = import.meta.env.VITE_DEBUG_MODE === "true";

  const [pageType, setPageType] = useState<PageType>("salon");
  // パーソナル占い再起動用キー（インクリメントで強制再マウント）
  const [personalPageKey, setPersonalPageKey] = useState(0);
  // プラン失効通知（"toast" | "dialog" | null）
  const [planExpiredNotification, setPlanExpiredNotification] = useState<
    "toast" | "dialog" | null
  >(null);
  // プラン変更検知用（前回プランコードを保持）
  const prevPlanCodeRef = useRef<string | null>(null);
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // 🔥 サイドバー状態
  // 🔥 AI API 課金中のナビゲーションロック（pageType に依存しない）
  // クイック占い: 占い結果保存完了まで / パーソナル占い: Phase2 開始〜完了まで
  const [isNavigationLocked, setIsNavigationLocked] = useState(false);

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
  } = useClient();

  const { openManage } = useSubscription();

  // 🔥 マスターデータ取得
  // ✅ 修正: 条件なしで呼び出し（lifecycle.tsがinit()を管理）
  const {
    isReady: masterIsReady,
    masterData,
    plans,
    isLoading: isMasterLoading,
  } = useMaster();

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

  useEffect(() => {
    void loadPersonalPage();
    void loadClaraPage();
    void loadPlansPage();
    void loadTarotistPage();
    void loadTarotistSwipePage();
    void loadSwipeableDemo();
    void loadHistoryPage();
    void loadSettingsPage();
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

  // 🔥 【実行時】プラン変更時に選択中の占い師を自動ダウングレード
  // ※ 起動時の補正は lifecycle.init() Step6 で実施済みのため、ここは実行中の変更のみ担当
  // ※ isInitialized が false の間はスキップ（起動時は Step6 が担当）
  // ※ isChangingPlan 中は中間状態で誤発火するためスキップ
  const { selectedTarotist, setSelectedTarotist } = useSalon();
  useEffect(() => {
    if (!isInitialized) return; // 起動時はスキップ（lifecycle.init() Step6 が担当）
    if (isChangingPlan) return;
    if (!currentPlan || !selectedTarotist?.plan) return;
    if (!canUseTarotist(selectedTarotist.plan, currentPlan)) {
      // 現在のプランで使える最高ランクの占い師に自動切り替え
      const available = masterData.tarotists
        .filter((t) => t.plan && canUseTarotist(t.plan, currentPlan))
        .sort((a, b) => (b.plan?.no ?? 0) - (a.plan?.no ?? 0));
      if (available.length > 0) {
        console.log(
          `[App] プラン変更により占い師を自動切り替え: ${selectedTarotist.name} → ${available[0].name}`,
        );
        setSelectedTarotist(available[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlan?.code, isChangingPlan, isInitialized]);

  // 🔥 プラン失効（ダウングレード）検知 → 通知 + サロン遷移
  useEffect(() => {
    if (!currentPlan) return;
    const prev = prevPlanCodeRef.current;
    prevPlanCodeRef.current = currentPlan.code;

    // 初回マウント時はスキップ
    if (prev === null) return;

    // プランが上がった or 変わっていない場合はスキップ
    const prevPlan = plans.find((p) => p.code === prev);
    if (!prevPlan || currentPlan.no >= prevPlan.no) return;

    // ダウングレード確定
    console.log(
      `[App] プランダウングレード検知: ${prev} → ${currentPlan.code}`,
    );
    if (isNavigationLocked) {
      // AI 課金中 → ダイアログ（OKを押してからサロンへ）
      setPlanExpiredNotification("dialog");
    } else {
      // それ以外 → 即サロンへ + トースト
      setPageType("salon");
      setPlanExpiredNotification("toast");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlan?.code]);

  // 🔥 左端から右スワイプでサイドバーを開く
  useEffect(() => {
    let startX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      // 左端20px以内から始まり、50px以上右にスワイプしたら開く
      // AI 課金中はサイドバーを開かない
      if (
        startX < 20 &&
        endX - startX > 50 &&
        !sidebarOpen &&
        !isNavigationLocked
      ) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [sidebarOpen, isNavigationLocked]);

  const handleLogin = async () => {
    try {
      console.log("ログイン開始");
      await appLogin();
      console.log("ログイン成功");
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
    // AI 課金中はナビゲーションをブロック
    if (isNavigationLocked) {
      console.log("ページ変更をブロック: AI 実行中");
      setSidebarOpen(false);
      return;
    }
    console.log("ページ変更:", page);
    setPageType(page);
  };

  // 🔥 占い開始（無料プランのみ広告表示 → 広告が閉じてから遷移）
  // Clara（OFFLINE占い師）が選択されている場合は "いつでも占い" ページへ
  // 占い開始 = AI 課金開始 → ナビゲーションをロック
  const handleStartReading = async () => {
    if (selectedTarotist?.provider === "OFFLINE") {
      setPageType("clara");
      return;
    }

    const isPaidPlan =
      currentPlan?.code === "STANDARD" || currentPlan?.code === "PREMIUM";
    if (!isPaidPlan) {
      await showInterstitialAd();
    }
    setIsNavigationLocked(true); // AI 課金開始 → ナビゲーションロック
    setPageType("reading");
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
    !masterIsReady ||
    !usageStats ||
    !payload
  ) {
    return (
      <TarotSplashScreen
        message={
          isDebugEnabled
            ? !isInitialized
              ? getStepLabel()
              : !authIsReady
                ? "認証情報を確認中... (1/4)"
                : !clientIsReady
                  ? "利用状況を取得中... (3/4)"
                  : !masterIsReady
                    ? "データを読み込み中... (4/4)"
                    : !usageStats
                      ? "利用状況を取得中... (3/4)"
                      : !payload
                        ? "認証情報を確認中... (1/4)"
                        : "準備完了"
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
      case "personal":
        return (
          <PersonalPage
            key={personalPageKey}
            payload={payload}
            currentPlan={currentPlan!}
            masterData={masterData}
            onChangePlan={handleChangePlan}
            onBack={() => setPersonalPageKey((k) => k + 1)}
            onStartReading={() => setIsNavigationLocked(true)}
            onCompleteReading={() => setIsNavigationLocked(false)}
            isChangingPlan={isChangingPlan}
            onNavigateToClara={() => setPageType("clara")}
          />
        );
      case "reading":
        return (
          <ReadingPage
            masterData={masterData}
            onBack={() => {
              setPageType("salon");
            }}
            onUnlock={() => setIsNavigationLocked(false)}
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
            onNavigateToClara={() => setPageType("clara")}
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
      case "clara":
        return (
          <ClaraPage
            masterData={masterData}
            currentPlan={currentPlan!}
            onChangePlan={handleChangePlan}
            onBack={() => setPageType("salon")}
          />
        );
      case "history":
        return <HistoryPage />;
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
        isOffline={isOffline}
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

      {/* 🔥 リフレッシュ中インジケーター（デバッグモードのみ） */}
      {isDebugEnabled && isRefreshing && (
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
          ⚠️{" "}
          {isDebugEnabled
            ? error.message
            : "エラーが発生しました。しばらく経ってからもう一度お試しください。"}
        </div>
      )}

      {/* 🔥 プラン失効トースト（3秒で自動消去） */}
      <AnimatePresence>
        {planExpiredNotification === "toast" && (
          <PlanExpiredToast onClose={() => setPlanExpiredNotification(null)} />
        )}
      </AnimatePresence>

      {/* 🔥 プラン失効ダイアログ（占い中に失効した場合） */}
      <AnimatePresence>
        {planExpiredNotification === "dialog" && (
          <PlanExpiredDialog
            onClose={() => {
              setPlanExpiredNotification(null);
              setPageType("salon");
            }}
          />
        )}
      </AnimatePresence>
      <Header
        currentPlan={currentPlan!.code as UserPlan}
        currentPage={pageType}
        onMenuClick={() => setSidebarOpen((prev) => !prev)}
        menuDisabled={isNavigationLocked}
        showProfile={showProfile}
        setShowProfile={setShowProfile}
      />
      {/* 開発メニュー（環境変数で制御） */}
      {isDebugEnabled && (
        <Suspense fallback={null}>
          <DebugMenu
            devMenuOpen={devMenuOpen}
            setDevMenuOpen={setDevMenuOpen}
            setPageType={setPageType}
          />
        </Suspense>
      )}

      {/* ユーザー情報表示 */}
      {payload.user && (
        <div className="fixed top-2 left-2 z-40 bg-black bg-opacity-10 text-xs px-2 py-1 rounded opacity-30 hover:opacity-80 transition-all">
          {payload.user.email}
        </div>
      )}
      <div className="main-content-area">
        <Suspense fallback={<PageFallback />}>{renderPage()}</Suspense>
      </div>
    </div>
  );
}

export default App;
