import { useSalon } from "../lib/hooks/use-salon";
import type { PageType, UserPlan } from "../types";

interface HeaderProps {
  currentPlan: UserPlan;
  currentPage: PageType;
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
  currentPlan,
  currentPage,
  onMenuClick,
}) => {
  const { spreadViewerMode } = useSalon();
  console.log(
    `[Header] currentPlan: ${currentPlan}, currentPage: ${currentPage}`
  );
  const getHeaderTitle = () => {
    switch (currentPage) {
      case "salon":
        switch (currentPlan) {
          case "FREE":
            return "🔮 今日のタロット占い";
          case "STANDARD":
            return "⭐ スタンダード占い";
          case "PREMIUM":
            return "🤖 AIタロットプレミアム";
          default:
            return "🔮 タロット占い";
        }
      case "plans":
        return "💎 プラン選択";
      case "tarotist":
        return "🔮 タロット占い師";
      case "history":
        return "📋 占い履歴";
      case "settings":
        return "⚙️ 設定";
      default:
        return "🔮 タロット占い";
    }
  };

  const getSubtitle = () => {
    switch (currentPage) {
      case "salon":
        switch (currentPlan) {
          case "GUEST":
            return "お試しでタロット占い";
          case "FREE":
            return "お気軽なタロット占い";
          case "STANDARD":
            return "本格的なタロット占い";
          case "PREMIUM":
            return "AIと対話しながら本格タロット占い";
          default:
            return "";
        }
      case "reading":
        return spreadViewerMode === "grid"
          ? "スプレッド表示"
          : "個別カード表示";
      case "plans":
        return "最適なプランを選択してください";
      case "tarotist":
        return "あなたに合った占い師を見つけよう";
      case "history":
        return "過去の占い結果を確認";
      case "settings":
        return "アプリの設定を管理";
      default:
        return "";
    }
  };

  return (
    <header className="app-header">
      <div className="header-container">
        {/* 🔥 ハンバーガーメニューボタン */}
        <button
          onClick={onMenuClick}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="メニューを開く"
        >
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        <h1 className="header-title">{getHeaderTitle()}</h1>
        {getSubtitle() && <p className="header-subtitle">{getSubtitle()}</p>}
      </div>
    </header>
  );
};

export default Header;
