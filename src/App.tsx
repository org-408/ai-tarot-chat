import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import AdBanner from "./components/AdBanner";
import FreePage from "./components/FreePage";
import Header from "./components/Header";
import Navigation from "./components/Navigation";
import PlansPage from "./components/PlansPage";
import PremiumPage from "./components/PremiumPage";
import StandardPage from "./components/StandardPage";
import { useTauriAuth } from "./hooks/useTauriAuth";
import { PageType, PlanFeatures, UserPlan } from "./types";

function App() {
  const [pageType, setPageType] = useState<PageType>("reading");
  const [currentPlan, setCurrentPlan] = useState<UserPlan>("Free");
  const [features, setFeatures] = useState<PlanFeatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [devMenuOpen, setDevMenuOpen] = useState(false);

  // 認証機能追加
  const {
    user,
    loading: authLoading,
    error: authError,
    signIn,
    signOut,
    isAuthenticated,
  } = useTauriAuth();

  // アプリ起動時にプラン情報を取得
  useEffect(() => {
    loadPlanInfo();
  }, []);

  // 広告表示スタイル関連
  useEffect(() => {
    if (currentPlan === "Free") {
      document.body.classList.add("with-ads");
    } else {
      document.body.classList.remove("with-ads");
    }

    return () => {
      document.body.classList.remove("with-ads");
    };
  }, [currentPlan]);

  const loadPlanInfo = async () => {
    try {
      const plan = await invoke<UserPlan>("get_current_plan");
      const planFeatures = await invoke<PlanFeatures>("get_plan_features");

      setCurrentPlan(plan);
      setFeatures(planFeatures);
    } catch (error) {
      console.error("プラン情報の取得に失敗:", error);
    } finally {
      setLoading(false);
    }
  };

  // プラン変更（テスト用）
  const changePlan = async (newPlan: UserPlan) => {
    try {
      await invoke("set_plan", { plan: newPlan });
      await loadPlanInfo(); // 再読み込み
    } catch (error) {
      console.error("プラン変更に失敗:", error);
    }
  };

  // ナビゲーション用ページ変更関数
  const handlePageChange = (page: PageType) => {
    setPageType(page);
  };

  // 認証確認のローディング表示
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  if (!features) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">エラーが発生しました</div>
      </div>
    );
  }

  // 未認証時はログイン画面表示
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🔮</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              AIタロット占い
            </h1>
            <p className="text-gray-600">AIと一緒に占いを楽しもう</p>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
              {authError}
            </div>
          )}

          <button
            onClick={signIn}
            disabled={authLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50"
          >
            {authLoading ? "認証中..." : "Googleでログイン"}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます
          </p>
        </div>
      </div>
    );
  }

  // プランに応じて表示するページを切り替え
  const renderPage = () => {
    switch (pageType) {
      case "reading":
        switch (currentPlan) {
          case "Free":
            return <FreePage features={features} onUpgrade={changePlan} />;
          case "Standard":
            return <StandardPage features={features} onUpgrade={changePlan} />;
          case "Premium":
            return <PremiumPage features={features} onDowngrade={changePlan} />;
          default:
            return <FreePage features={features} onUpgrade={changePlan} />;
        }
      case "plans":
        return (
          <PlansPage
            features={features}
            currentPlan={currentPlan}
            onChangePlan={changePlan}
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

              {/* ログアウトボタンを設定画面に追加 */}
              <div className="mt-8">
                <button
                  onClick={signOut}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  ログアウト
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return <FreePage features={features} onUpgrade={changePlan} />;
    }
  };

  return (
    <div className="bg-gray-100 w-full overflow-x-hidden">
      {/* 固定ヘッダー */}
      <Header currentPlan={currentPlan} currentPage={pageType} />

      {/* 開発用：超ミニマル切り替えボタン */}
      <div className="fixed top-2 right-2 z-50">
        {/* 小さな開発アイコン */}
        <button
          onClick={() => setDevMenuOpen(!devMenuOpen)}
          className="w-6 h-6 bg-black bg-opacity-20 hover:bg-opacity-40 rounded-full text-xs text-white flex items-center justify-center transition-all opacity-30 hover:opacity-80"
          title="開発メニュー"
        >
          ⚙
        </button>

        {/* 展開メニュー */}
        {devMenuOpen && (
          <div className="absolute top-8 right-0 bg-white bg-opacity-95 backdrop-blur-sm p-2 rounded shadow-lg border">
            <div className="text-xs mb-2 text-gray-600">プラン切り替え</div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  changePlan("Free");
                  setDevMenuOpen(false);
                  setPageType("reading");
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  currentPlan === "Free"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                🆓 Free
              </button>
              <button
                onClick={() => {
                  changePlan("Standard");
                  setDevMenuOpen(false);
                  setPageType("reading");
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  currentPlan === "Standard"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                💎 Standard
              </button>
              <button
                onClick={() => {
                  changePlan("Premium");
                  setDevMenuOpen(false);
                  setPageType("reading");
                }}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  currentPlan === "Premium"
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
              <button
                onClick={() => {
                  signOut();
                  setDevMenuOpen(false);
                }}
                className="px-2 py-1 text-xs rounded transition-colors bg-red-200 hover:bg-red-300"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ユーザー情報表示（開発用） */}
      {user && (
        <div className="fixed top-2 left-2 z-40 bg-black bg-opacity-10 text-xs px-2 py-1 rounded opacity-30 hover:opacity-80 transition-all">
          {user.email}
        </div>
      )}

      {/* メインコンテンツ */}
      {renderPage()}

      {/* 固定広告バナー（フリープランのみ） */}
      <AdBanner currentPlan={currentPlan} />

      {/* ボトムナビゲーション */}
      <Navigation currentPage={pageType} onPageChange={handlePageChange} />
    </div>
  );
}

export default App;
