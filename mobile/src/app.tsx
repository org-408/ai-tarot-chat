import { AnimatePresence, motion } from "framer-motion";
import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Plan, Reading } from "../../shared/lib/types";
import Header from "./components/header";
import HomePage from "./components/home-page";
import ReadingPage from "./components/reading-page";
import SidebarMenu from "./components/sidebar-menu";
import { useAuth } from "./lib/hooks/use-auth";
import { useClient } from "./lib/hooks/use-client";
import { useLanguage } from "./lib/hooks/use-language";
import { useLifecycle } from "./lib/hooks/use-lifecycle";
import { useMaster } from "./lib/hooks/use-master";
import { useSalon } from "./lib/hooks/use-salon";
import { useAppStore } from "./lib/stores/app";
import { useSalonStore } from "./lib/stores/salon";
import { useSubscription } from "./lib/hooks/use-subscription";
import { showInterstitialAd } from "./lib/utils/admob";
import { Http } from "./lib/utils/http";
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
  const { t } = useTranslation();
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
      <span>{t("plans.planExpiredToast")}</span>
    </motion.div>
  );
};

// ─────────────────────────────────────────────
// 強制アンロック通知コンポーネント
// ─────────────────────────────────────────────

const ForceUnlockToast: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-28 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-2xl shadow-lg text-sm font-medium whitespace-nowrap"
    >
      <span>🔓</span>
      <span>{t("error.forceUnlockedToast")}</span>
    </motion.div>
  );
};

const PlanExpiredDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  return (
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
            {t("plans.planChangedTitle")}
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            {t("plans.planChangedBody1")}
            <br />
            {t("plans.planChangedBody2")}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl active:opacity-80"
        >
          {t("common.ok")}
        </button>
      </motion.div>
    </motion.div>
  );
};

const PageFallback: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-12">
      <div className="rounded-2xl bg-white/85 px-5 py-3 text-sm font-medium text-gray-600 shadow-lg backdrop-blur-sm">
        {t("common.loading")}
      </div>
    </div>
  );
};

function App() {
  const { t } = useTranslation();
  // ✅ デバッグモードフラグ（本番は false に設定）
  const isDebugEnabled = import.meta.env.VITE_DEBUG_MODE === "true";

  // 🌐 言語 / i18n 初期化（端末言語 or ユーザー設定で ja/en を決定）
  const { isReady: languageIsReady } = useLanguage();

  const [pageType, setPageType] = useState<PageType>("home");
  const [isPageRestored, setIsPageRestored] = useState(false);
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
  const [showForceUnlockToast, setShowForceUnlockToast] = useState(false);
  const [historyInitialReading, setHistoryInitialReading] = useState<Reading | null>(null);

  // 🔥 ロック中のメニュー長押しによる強制アンロック（ハング時の救済措置）
  const handleForceUnlock = useCallback(() => {
    console.log("[App] Force unlock triggered by long press");
    useSalonStore.getState().init();
    setIsNavigationLocked(false);
    setPageType("home");
    setPersonalPageKey((k) => k + 1);
    setShowForceUnlockToast(true);
  }, []);

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

  // 🔥 選択中占い師（handleStartReading で OFFLINE 判定に使用）
  const {
    selectedTarotist,
    selectedPersonalTarotist,
    setSelectedTargetMode,
    setSelectedPersonalTargetMode,
  } = useSalon();

  // 起動時・プラン変更時: 現プランで使えない占い師が選択されていれば、
  //   占い師選択モードに戻してユーザーに再確認を促す（選択状態そのものは保持）。
  //   再度プランアップ時に前回の選択が復元されるため、解約→再加入で選び直しが不要。
  //   プラン外タロティストでの実行はサーバ側 PLAN_INSUFFICIENT ガードで弾く。
  useEffect(() => {
    if (!currentPlan) return;
    if (selectedTarotist?.plan && selectedTarotist.plan.no > currentPlan.no) {
      setSelectedTargetMode("tarotist");
    }
    if (selectedPersonalTarotist?.plan && selectedPersonalTarotist.plan.no > currentPlan.no) {
      setSelectedPersonalTargetMode("tarotist");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlan?.no]);

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
      // AI 課金中 → ダイアログ（OK を押してからホームへ）
      setPlanExpiredNotification("dialog");
    } else {
      // 到達可能性チェック: personal は hasPersonal、history は hasHistory が必要
      const pageStillAccessible =
        (pageType !== "personal" || currentPlan.hasPersonal) &&
        (pageType !== "history" || currentPlan.hasHistory);

      if (!pageStillAccessible) {
        setPageType("home");
      }
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

      useAppStore.getState().resetLastPageType();
      setPageType("home");
    } catch (err) {
      console.error("ログアウトエラー:", err);
    }
  };

  // 🔥 アカウント削除処理
  const handleDeleteAccount = async () => {
    await Http.executeRequest({ method: "DELETE", path: "/api/clients/me", requiresAuth: true });
    await appLogout();
    useAppStore.getState().resetLastPageType();
    setPageType("home");
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
  // navigateToPersonal=true のときだけ成功後に personal へ自動遷移する。
  // 呼び出し元が「アップグレード → 即パーソナル占い」を意図している場合のみ true。
  // salon のタロティストカードなど、現在地に留まりたい呼び出し元は渡さない。
  const handleChangePlan = async (
    newPlan: UserPlan,
    options?: { navigateToPersonal?: boolean },
  ) => {
    console.log(`プラン変更リクエスト: ${currentPlan?.code} → ${newPlan}`);

    try {
      // changePlanが全てを処理（サインインが必要な場合も内部で処理）
      await changePlan(getPlan(newPlan)!);
      console.log("プラン変更成功");
      if (newPlan === "PREMIUM" && options?.navigateToPersonal) {
        setPageType("personal");
      }
    } catch (err) {
      console.error("プラン変更エラー:", err);
      // エラーは planChangeError で処理されるため、ここでは何もしない
    }
  };

  const navigateToHistoryList = useCallback(() => {
    setHistoryInitialReading(null);
    setPageType("history");
  }, []);

  const navigateToHistoryReading = useCallback((reading: Reading) => {
    setHistoryInitialReading(reading);
    setPageType("history");
  }, []);

  // 🔥 ページ変更（サイドバー等からの任意ナビゲーション）
  const handlePageChange = (page: PageType) => {
    // AI 課金中はナビゲーションをブロック
    if (isNavigationLocked) {
      console.log("ページ変更をブロック: AI 実行中");
      setSidebarOpen(false);
      return;
    }
    console.log("ページ変更:", page);
    if (page === "history") {
      navigateToHistoryList();
      return;
    }
    setHistoryInitialReading(null);
    setPageType(page);
  };

  // 🔥 占い開始（無料プランのみ広告表示 → 広告が閉じてから遷移）
  // Clara（OFFLINE占い師）が選択されている場合は "いつでも占い" ページへ
  // 占い開始 = AI 課金開始 → ナビゲーションをロック
  const handleStartReading = async () => {
    const isPaidPlan =
      currentPlan?.code === "STANDARD" || currentPlan?.code === "PREMIUM";
    if (!isPaidPlan) {
      await showInterstitialAd();
    }

    if (selectedTarotist?.provider === "OFFLINE") {
      setPageType("clara");
      return;
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

  // 60秒ごとに usage / プランを更新（RC リスナーの補完）
  useEffect(() => {
    if (!clientIsReady) return;
    const id = setInterval(refreshUsage, 60_000);
    return () => clearInterval(id);
  }, [clientIsReady, refreshUsage]);

  // 🔥 前回の pageType を復元（プラン／認証が揃ってから一度だけ実行）
  useEffect(() => {
    if (isPageRestored) return;
    if (!clientIsReady || !currentPlan) return;

    const stored = useAppStore.getState().lastPageType;
    let target: PageType = "home";

    if (stored) {
      if (stored === "reading") {
        // reading は salon からの遷移専用。途中で中断した場合は salon に戻す
        target = "salon";
      } else if (stored === "personal" && !currentPlan.hasPersonal) {
        target = "home";
      } else if (stored === "history" && !currentPlan.hasHistory) {
        target = "home";
      } else {
        target = stored;
      }
    }

    console.log("[App] 前回画面を復元:", { stored, target });
    setPageType(target);
    setIsPageRestored(true);
  }, [isPageRestored, clientIsReady, currentPlan]);

  // 🔥 pageType の変更を永続化（復元完了後のみ）
  useEffect(() => {
    if (!isPageRestored) return;
    useAppStore.getState().setLastPageType(pageType);
  }, [pageType, isPageRestored]);

  // 占い師プロフィールダイアログ管理
  const [showProfile, setShowProfile] = useState(false);

  // 初期化中またはデータロード中
  if (
    !languageIsReady ||
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
            ? !languageIsReady
              ? t("splash.initLanguage")
              : !isInitialized
                ? getStepLabel()
                : !authIsReady
                  ? t("splash.checkingAuth")
                  : !clientIsReady
                    ? t("splash.fetchingUsage")
                    : !masterIsReady
                      ? t("splash.loadingData")
                      : !usageStats
                        ? t("splash.fetchingUsage")
                        : !payload
                          ? t("splash.checkingAuth")
                          : t("splash.ready")
            : t("common.loading")
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
          <div className="text-xl font-bold mb-2">{t("error.initTitle")}</div>
          <div className="text-sm opacity-80">{t("error.initBody")}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-white text-purple-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {t("common.reload")}
          </button>
        </div>
      </div>
    );
  }

  // ページレンダリング
  const renderPage = () => {
    switch (pageType) {
      case "home":
        return (
          <HomePage
            payload={payload}
            currentPlan={currentPlan!}
            masterData={masterData}
            usageStats={usageStats}
            onNavigateToSalon={() => setPageType("salon")}
            onNavigateToPersonal={() => setPageType("personal")}
            onNavigateToClara={() => setPageType("clara")}
            onNavigateToTarotist={() => setPageType("tarotist")}
            onNavigateToHistory={navigateToHistoryList}
            onNavigateToReading={navigateToHistoryReading}
            onChangePlan={handleChangePlan}
            isChangingPlan={isChangingPlan}
          />
        );
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
            isPlanExpiredShowing={planExpiredNotification !== null}
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
            onBack={() => setPageType("salon")}
          />
        );
      case "history":
        return (
          <HistoryPage
            initialReading={historyInitialReading ?? undefined}
            onInitialReadingConsumed={() => setHistoryInitialReading(null)}
          />
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
            onDeleteAccount={handleDeleteAccount}
          />
        );
      default:
        return (
          <HomePage
            payload={payload}
            currentPlan={currentPlan!}
            masterData={masterData}
            usageStats={usageStats}
            onNavigateToSalon={() => setPageType("salon")}
            onNavigateToPersonal={() => setPageType("personal")}
            onNavigateToClara={() => setPageType("clara")}
            onNavigateToTarotist={() => setPageType("tarotist")}
            onNavigateToHistory={navigateToHistoryList}
            onNavigateToReading={navigateToHistoryReading}
            onChangePlan={handleChangePlan}
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
                  {t("plans.changingPlanTitle")}
                </div>
                <div className="text-sm text-gray-600 text-center leading-relaxed">
                  {t("plans.changingPlanBody")}
                  <br />
                  <span className="text-purple-500 font-medium">
                    {t("plans.changingPlanWait")}
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
      {/* ✅ オフライン通知（デバッグモードのみ） */}
      {isDebugEnabled && isOffline && offlineMode === "limited" && (
        <div className="fixed top-28 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-600 text-white p-2 rounded-full text-xs shadow-lg">
          📡 {getOfflineModeLabel()}
        </div>
      )}
      {/* ✅ 完全オフライン警告 */}
      {offlineMode === "full" && (
        <div className="fixed top-28 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white p-2 rounded-full text-xs shadow-lg">
          ⚠️ {t("error.offlineFirstLaunch")}
        </div>
      )}
      {/* 🔥 日付変更通知 */}
      {dateChanged && (
        <div className="fixed top-28 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white p-2 rounded-full text-xs shadow-lg">
          ✨ {t("common.newDayStarted")}
        </div>
      )}
      {/* 🔥 エラー通知 */}
      {error && (
        <div className="fixed top-28 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white p-2 rounded-full text-xs shadow-lg">
          ⚠️{" "}
          {isDebugEnabled ? error.message : t("error.genericRetryLater")}
        </div>
      )}

      {/* 🔥 プラン失効トースト（3秒で自動消去） */}
      <AnimatePresence>
        {planExpiredNotification === "toast" && (
          <PlanExpiredToast onClose={() => setPlanExpiredNotification(null)} />
        )}
      </AnimatePresence>

      {/* 🔓 強制アンロックトースト（2.5秒で自動消去） */}
      <AnimatePresence>
        {showForceUnlockToast && (
          <ForceUnlockToast onClose={() => setShowForceUnlockToast(false)} />
        )}
      </AnimatePresence>

      {/* 🔥 プラン失効ダイアログ（占い中に失効した場合） */}
      <AnimatePresence>
        {planExpiredNotification === "dialog" && (
          <PlanExpiredDialog
            onClose={() => {
              setPlanExpiredNotification(null);
              setPageType("home");
            }}
          />
        )}
      </AnimatePresence>
      <Header
        currentPlan={currentPlan!.code as UserPlan}
        currentPage={pageType}
        onMenuClick={() => setSidebarOpen((prev) => !prev)}
        menuDisabled={isNavigationLocked}
        onForceUnlock={handleForceUnlock}
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
