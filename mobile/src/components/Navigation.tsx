import type { NavigationItem, PageType } from "../types";

interface NavigationProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onPageChange,
}) => {
  const navigationItems: NavigationItem[] = [
    {
      id: "salon",
      label: "占い",
      icon: "🔮",
      available: true,
    },
    {
      id: "plans",
      label: "プラン",
      icon: "💎",
      available: true,
    },
    {
      id: "history",
      label: "履歴",
      icon: "📋",
      available: false,
    },
    {
      id: "settings",
      label: "設定",
      icon: "⚙️",
      available: false,
    },
  ];

  const handleNavClick = (item: NavigationItem) => {
    if (item.available) {
      onPageChange(item.id);
    }
  };

  return (
    <nav className="bottom-navigation">
      <div className="bottom-nav-container">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item)}
            disabled={!item.available}
            className={`bottom-nav-item ${
              currentPage === item.id ? "active" : ""
            } ${!item.available ? "disabled" : ""}`}
            title={!item.available ? "準備中" : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {!item.available && (
              <span className="coming-soon-badge">準備中</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
