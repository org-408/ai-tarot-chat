import { useSalon } from "../lib/hooks/use-salon";
import type { PageType, UserPlan } from "../types";

interface HeaderProps {
  currentPlan: UserPlan;
  currentPage: PageType;
  onMenuClick: () => void;
  menuDisabled?: boolean;
  showProfile: boolean;
  setShowProfile: React.Dispatch<React.SetStateAction<boolean>>;
}

const Header: React.FC<HeaderProps> = ({
  currentPlan,
  currentPage,
  onMenuClick,
  menuDisabled = false,
  showProfile,
  setShowProfile,
}) => {
  const { selectedTarotist, isPersonal } = useSalon();
  console.log(
    `[Header] currentPlan: ${currentPlan}, currentPage: ${currentPage}`
  );
  const getHeaderTitle = () => {
    switch (currentPage) {
      case "salon":
      case "reading":
        switch (currentPlan) {
          case "FREE":
            return "🔮 タロット占い";
          case "STANDARD":
            return "⭐ 本格タロット占い";
          case "PREMIUM":
            return isPersonal ? "🤖 パーソナル占い" : "本格タロット占い";
          default:
            return "🔮 タロット占い";
        }
      case "personal":
        return "✨ パーソナル占い";
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
          case "PREMIUM":
            return "本格的なタロット占い";
          default:
            return "";
        }
      case "personal":
        return "AIと対話しながら本格タロット占い";
      case "reading":
        return `占い師: ${selectedTarotist!.name}`;
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
          disabled={menuDisabled}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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

        <div
          onClick={() => {
            setShowProfile(!showProfile);
          }}
        >
          <h1 className="header-title">{getHeaderTitle()}</h1>
          {getSubtitle() && <p className="header-subtitle">{getSubtitle()}</p>}
        </div>
      </div>
    </header>
  );
};

export default Header;
