import { useTranslation } from "react-i18next";
import { useReading } from "../lib/hooks/use-reading";
import { useForceLongPress } from "../lib/hooks/use-force-unlock";
import type { PageType, UserPlan } from "../types";

interface HeaderProps {
  currentPlan: UserPlan;
  currentPage: PageType;
  onMenuClick: () => void;
  menuDisabled?: boolean;
  onForceUnlock?: () => void;
  showProfile: boolean;
  setShowProfile: React.Dispatch<React.SetStateAction<boolean>>;
}

const Header: React.FC<HeaderProps> = ({
  currentPlan,
  currentPage,
  onMenuClick,
  menuDisabled = false,
  onForceUnlock,
  showProfile,
  setShowProfile,
}) => {
  const { t } = useTranslation();
  const { selectedTarotist, isPersonal } = useReading();

  const { handlers: longPressHandlers, progress, isHolding } = useForceLongPress(
    onForceUnlock ?? (() => {}),
    { enabled: menuDisabled && !!onForceUnlock }
  );

  // SVG 円弧の計算（半径 14、円周 ≒ 87.96）
  const RADIUS = 14;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const getHeaderTitle = () => {
    switch (currentPage) {
      case "home":
        return t("header.home");
      case "quick":
      case "reading":
        switch (currentPlan) {
          case "FREE":
            return t("header.quickFree");
          case "STANDARD":
            return t("header.quickStandard");
          case "PREMIUM":
            return isPersonal
              ? t("header.personalPremium")
              : t("header.quickPremium");
          default:
            return t("header.quickDefault");
        }
      case "personal":
        return t("header.personal");
      case "plans":
        return t("header.plans");
      case "tarotist":
        return t("header.tarotist");
      case "history":
        return t("header.history");
      case "settings":
        return t("header.settings");
      case "clara":
        return t("header.clara");
      default:
        return t("header.home");
    }
  };

  const getSubtitle = () => {
    switch (currentPage) {
      case "home":
        return t("header.homeSubtitle");
      case "quick":
        switch (currentPlan) {
          case "GUEST":
            return t("header.quickSubtitleGuest");
          case "FREE":
            return t("header.quickSubtitleFree");
          case "STANDARD":
          case "PREMIUM":
            return t("header.quickSubtitlePaid");
          default:
            return "";
        }
      case "personal":
        return t("header.personalSubtitle");
      case "reading":
        return selectedTarotist
          ? t("header.readingSubtitleWithName", {
              name: selectedTarotist.name,
            })
          : "";
      case "plans":
        return t("header.plansSubtitle");
      case "tarotist":
        return t("header.tarotistSubtitle");
      case "history":
        return t("header.historySubtitle");
      case "settings":
        return t("header.settingsSubtitle");
      case "clara":
        return t("header.claraSubtitle");
      default:
        return "";
    }
  };

  return (
    <header className="app-header relative">
      {/* ハンバーガーメニューボタン（.header-container の max-width 制限を受けず、
          常に viewport 左端を基準に配置する。safe-area 分を除いた領域で縦中央揃え） */}
      <div
        className="absolute left-4 flex items-center z-10"
        style={{ top: "var(--safe-top)", bottom: 0 }}
      >
        <div className="relative">
          <button
            onClick={onMenuClick}
            disabled={menuDisabled}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label={t("header.openMenu")}
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

          {/* ロングプレス中の円弧プログレス */}
          {isHolding && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 40 40"
            >
              <circle
                cx="20"
                cy="20"
                r={RADIUS}
                fill="none"
                stroke="white"
                strokeOpacity={0.7}
                strokeWidth={2.5}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 20 20)"
              />
            </svg>
          )}

          {/* ロック中のみ表示するポインターイベントキャプチャレイヤー */}
          {menuDisabled && (
            <div
              className="absolute inset-0 z-10 touch-none"
              {...longPressHandlers}
            />
          )}
        </div>
      </div>

      <div className="header-container">
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
