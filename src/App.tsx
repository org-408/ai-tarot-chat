import { useEffect, useState } from "react";
import { JWTPayload, RemainingReadings } from "../shared/lib/types";
import AdBanner from "./components/AdBanner";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import PlansPage from "./components/PlansPage";
import SalonPage from "./components/SalonPage";
import { initializeApp } from "./lib/init";
import { AuthService } from "./lib/services/auth";
import { readingService } from "./lib/services/reading";
import { syncService } from "./lib/services/sync";
import TarotSplashScreen from "./splashscreen";
import { MasterData, PageType, UserPlan } from "./types";

function App() {
  const [pageType, setPageType] = useState<PageType>("reading");
  const [masterData, setMasterData] = useState<MasterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [devMenuOpen, setDevMenuOpen] = useState(false);
  const [remainingReadings, setRemainingReadings] =
    useState<RemainingReadings>();
  const [jwtPayload, setJwtPayload] = useState<null | JWTPayload>(null);
  const currentPlan = (jwtPayload?.planCode as UserPlan) || "GUEST";

  // AuthServiceインスタンス

  const authService = new AuthService();

  // 起動時フロー
  useEffect(() => {
    initializeSession();
  }, []);

  // 広告表示スタイル
  useEffect(() => {
    if (!jwtPayload || currentPlan === "FREE" || currentPlan === "GUEST") {
      document.body.classList.add("with-ads");
    } else {
      document.body.classList.remove("with-ads");
    }

    return () => {
      document.body.classList.remove("with-ads");
    };
  }, [jwtPayload]);

  /**
   * セッション初期化
   * 1. デバイス登録
   * 2. セッション情報取得
   */
  const initializeSession = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("アプリ起動 - セッション初期化開始");
      // storeなど初期化
      await initializeApp();

      // デバイス登録
      const payload = await authService.registerDevice();
      console.log("デバイス登録完了", payload);

      setJwtPayload(payload);

      // マスターデータ取得
      const masters = await syncService.getMasterData();
      setMasterData(masters);
      console.log("マスターデータ同期完了", masters);

      // 占い残数の取得（毎回サーバーから取得）
      const remaining = await readingService.getRemainingReadings();
      setRemainingReadings(remaining);
      console.log("占い残数取得完了", remaining);

      console.log("セッション初期化完了");
      setLoading(false);
    } catch (err) {
      // ...
    }
  };

  useEffect(() => {
    console.log("masterData 更新:", masterData);
  }, [masterData]);

  /**
   * ログイン処理
   */
  const handleLogin = async () => {
    try {
      setLoading(true);
      console.log("ログイン開始");

      const payload = await authService.signInWithWeb();
      console.log("ログイン成功:", payload);

      // セッション更新
      setJwtPayload(payload);
    } catch (err) {
      console.error("ログイン失敗:", err);
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  /**
   * ログアウト処理
   */
  const handleLogout = async () => {
    try {
      await authService.logout();

      // デバイス再登録
      const payload = await authService.registerDevice();
      console.log("サインアウト デバイス再登録:", payload);

      setJwtPayload(payload);
    } catch (err) {
      console.error("ログアウトエラー・デバイス再登録:", err);
    }
  };

  /**
   * プラン変更（モック実装）
   */
  const handlePlanChange = (newPlan: UserPlan) => {
    console.log(`プラン変更リクエスト: ${currentPlan} → ${newPlan}`);

    // 有料プランかつ未認証の場合はログインが必要
    if ((newPlan === "STANDARD" || newPlan === "PREMIUM") && !isAuthenticated) {
      console.log("認証が必要です。");
      return;
    }

    // TODO: サーバー側でプラン変更APIを実装
    // 現状は一時的にローカル変更のみ
    const success = readingService.changePlan(newPlan);
    if (!success) {
      console.error("プラン変更に失敗しました");
      return;
    }
    console.log(`プランを ${newPlan} に変更しました（モック）`);
  };

  /**
   * アップグレード処理（モック実装）
   */
  const handleUpgrade = (targetPlan: UserPlan) => {
    console.log(`アップグレードリクエスト: ${targetPlan}`);
    handlePlanChange(targetPlan);
  };

  /**
   * ダウングレード処理（モック実装）
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
    setPageType(page);
  };

  // ローディング表示
  if (loading && !jwtPayload) {
    return (
      // <div className="flex items-center justify-center min-h-screen">
      //   <div className="text-xl">読み込み中...</div>
      // </div>
      <TarotSplashScreen message={"読み込み中..."} />
    );
  }

  // エラー表示
  if (error && !jwtPayload) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  // セッションがない場合のフォールバック
  if (!jwtPayload) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">
          セッションの取得に失敗しました
        </div>
      </div>
    );
  }

  // マスターデータ・残回数データがない場合のフォールバック
  if (!masterData || !remainingReadings) {
    return (
      <TarotSplashScreen message={"マスターデータを同期中..."} />
      // <div className="flex items-center justify-center min-h-screen">
      //   <div className="text-xl">マスターデータを同期中...</div>
      // </div>
    );
  }

  const isAuthenticated = !!jwtPayload?.user;

  // ページレンダリング
  const renderPage = () => {
    switch (pageType) {
      case "reading":
        return (
          <SalonPage
            payload={jwtPayload}
            masterData={masterData}
            isAuthenticated={isAuthenticated}
            onLogin={handleLogin}
            onUpgrade={handleUpgrade}
            onDowngrade={handleDowngrade}
            isLoggingIn={loading}
            remainingReadings={remainingReadings}
            onStartReading={(spreadId, categoryId) => {
              console.log(
                `占い開始: spread=${spreadId}, category=${categoryId}`
              );
              // TODO: ReadingPageに遷移
            }}
          />
        );
      // switch (session.plan) {
      //   case "GUEST":
      //   case "FREE":
      //     return (
      //       <FreePage
      //         onLogin={handleLogin}
      //         onUpgrade={handleUpgrade}
      //         isAuthenticated={isAuthenticated}
      //         user={session.user}
      //         isLoggingIn={loading}
      //         remainingReadings={remainingReadings}
      //       />
      //     );
      //   case "STANDARD":
      //     return (
      //       <StandardPage
      //         onUpgrade={handleUpgrade}
      //         onDowngrade={handleDowngrade}
      //         isAuthenticated={isAuthenticated}
      //         user={session.user}
      //         isLoggingIn={loading}
      //         remainingReadings={remainingReadings}
      //       />
      //     );
      //   case "PREMIUM":
      //     return (
      //       <PremiumPage
      //         onDowngrade={handleDowngrade}
      //         isAuthenticated={isAuthenticated}
      //         user={session.user}
      //         isLoggingIn={loading}
      //         remainingReadings={remainingReadings}
      //       />
      //     );
      //   default:
      //     return (
      //       <FreePage
      //         onLogin={handleLogin}
      //         onUpgrade={handleUpgrade}
      //         isAuthenticated={isAuthenticated}
      //         user={session.user}
      //         isLoggingIn={loading}
      //         remainingReadings={remainingReadings}
      //       />
      //     );
      // }
      case "plans":
        return (
          <PlansPage
            payload={jwtPayload}
            plans={masterData.plans}
            isAuthenticated={isAuthenticated}
            onChangePlan={handlePlanChange}
            onLogin={handleLogin}
            isLoggingIn={loading}
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
            payload={jwtPayload}
            masterData={masterData}
            isAuthenticated={isAuthenticated}
            onLogin={handleLogin}
            onUpgrade={handleUpgrade}
            onDowngrade={handleDowngrade}
            isLoggingIn={loading}
            remainingReadings={remainingReadings}
            onStartReading={(spreadId, categoryId) => {
              console.log(
                `占い開始: spread=${spreadId}, category=${categoryId}`
              );
              // TODO: ReadingPageに遷移
            }}
          />
        );
    }
  };

  return (
    <div className="bg-gray-100 w-full overflow-x-hidden">
      <Header currentPlan={currentPlan} currentPage={pageType} />

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
                  setPageType("reading");
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  currentPlan === "FREE"
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
                  setPageType("reading");
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  currentPlan === "STANDARD"
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
                  setPageType("reading");
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  currentPlan === "PREMIUM"
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
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  pageType === "plans"
                    ? "bg-purple-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
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
                  🔑 Login
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ユーザー情報表示 */}
      {jwtPayload.user && (
        <div className="fixed top-2 left-2 z-40 bg-black bg-opacity-10 text-xs px-2 py-1 rounded opacity-30 hover:opacity-80 transition-all">
          {jwtPayload.user.email}
        </div>
      )}

      {renderPage()}

      <AdBanner currentPlan={currentPlan} />

      <Navigation currentPage={pageType} onPageChange={handlePageChange} />
    </div>
  );
}

export default App;
