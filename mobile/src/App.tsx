import { useState } from "react";
import AdBanner from "./components/AdBanner";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import PlansPage from "./components/PlansPage";
import ReadingPage from "./components/ReadingPage";
import SalonPage from "./components/SalonPage";
import TarotSplashScreen from "./splashscreen";
import type { PageType, UserPlan } from "./types";
import { useAuth } from "./lib/hooks/useAuth";
import { queryClient } from "./components/providers/QueryProvider";
import { clientService } from "./lib/services/client";

function App() {
  const [pageType, setPageType] = useState<PageType>("salon");
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 占いセッション用
  const [readingData, setReadingData] = useState<{
    spreadId: string;
    categoryId: string;
  } | null>(null);

  // 🔥 App.tsxは認証状態のみ管理（広告・ヘッダー用）
  const { payload, plan, isAuthenticated, userId, login: authLogin, logout: authLogout, setPayload, changePlan } = useAuth();

  // 初期化中
  if (!payload) {
    return <TarotSplashScreen message="読み込み中..." />;
  }

  /**
   * ログイン処理（複数ページから呼ばれる）
   */
  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      console.log("ログイン開始");

      await authLogin();
      console.log("ログイン成功");

      // 利用状況を再取得
      await queryClient.invalidateQueries({ queryKey: ['usage', userId] });
    } catch (err) {
      console.error("ログイン失敗:", err);
      alert(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setIsLoggingIn(false);
    }
  };

  /**
   * ログアウト処理
   */
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

  /**
   * プラン変更（複数ページから呼ばれる）
   */
  const handlePlanChange = async (newPlan: UserPlan) => {
    console.log(`プラン変更リクエスト: ${plan} → ${newPlan}`);

    if ((newPlan === "STANDARD" || newPlan === "PREMIUM") && !isAuthenticated) {
      console.log("認証が必要です。");
      return;
    }

    try {
      await changePlan(newPlan);
      
      // 利用状況を再取得
      await queryClient.invalidateQueries({ queryKey: ['usage', payload.user?.id] });
      console.log("利用状況を再取得");
    } catch (err) {
      console.error("プラン変更エラー:", err);
    }
  };

  /**
   * アップグレード処理
   */
  const handleUpgrade = (targetPlan: UserPlan) => {
    console.log(`アップグレードリクエスト: ${targetPlan}`);
    handlePlanChange(targetPlan);
  };

  /**
   * ダウングレード処理
   */
  const handleDowngrade = (targetPlan: UserPlan) => {
    console.log(`ダウングレードリクエスト: ${targetPlan}`);
    if (confirm(`本当に ${targetPlan} プランにダウングレードしますか？`)) {
      handlePlanChange(targetPlan);
    }
  };

  /**
   * ページ変更
   */
  const handlePageChange = (page: PageType) => {
    console.log("ページ変更:", page);
    setPageType(page);
  };

  /**
   * 占い開始
   */
  const handleStartReading = (spreadId: string, categoryId: string) => {
    console.log(`占い開始: spread=${spreadId}, category=${categoryId}`);
    setReadingData({ spreadId, categoryId });
    setPageType("reading");
  };

  /**
   * 占いから戻る
   */
  const handleBackFromReading = () => {
    console.log("占いから戻る");
    setReadingData(null);
    setPageType("salon");
  };

  // ページレンダリング
  const renderPage = () => {
    switch (pageType) {
      case "salon":
        return (
          <SalonPage
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
            spreadId={readingData?.spreadId || ""}
            categoryId={readingData?.categoryId || ""}
            onBack={handleBackFromReading}
          />
        );
      case "plans":
        return (
          <PlansPage
            onLogin={handleLogin}
            onChangePlan={handlePlanChange}
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
      <Header currentPlan={plan} currentPage={pageType} />

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
                  plan === "FREE"
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
                  plan === "STANDARD"
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
                  plan === "PREMIUM"
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

      <div className={`main-content-area ${plan === "FREE" || plan === "GUEST" ? 'with-ads' : ''}`}>
        {renderPage()}
      </div>

      <AdBanner currentPlan={plan} />

      <Navigation currentPage={pageType} onPageChange={handlePageChange} />
    </div>
  );
}

export default App;