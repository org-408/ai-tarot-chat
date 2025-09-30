import { PageType, UserPlan } from "../types";

interface HeaderProps {
  currentPlan: UserPlan;
  currentPage: PageType;
}

const Header: React.FC<HeaderProps> = ({ currentPlan, currentPage }) => {
  const getHeaderTitle = () => {
    switch (currentPage) {
      case "reading":
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
      case "reading":
        switch (currentPlan) {
          case "FREE":
            return "お気軽なタロット占い";
          case "STANDARD":
            return "本格的なタロット占い";
          case "PREMIUM":
            return "AIと対話しながら本格タロット占い";
          default:
            return "";
        }
      case "plans":
        return "最適なプランを選択してください";
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
        <h1 className="header-title">{getHeaderTitle()}</h1>
        {getSubtitle() && <p className="header-subtitle">{getSubtitle()}</p>}
      </div>
    </header>
  );
};

export default Header;
