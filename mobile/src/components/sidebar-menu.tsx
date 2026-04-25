import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { getPlanBadgeLabel } from "../lib/utils/plan-display";
import type { PageType } from "../types";

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  currentPlan: string;
  userEmail?: string;
  isOffline?: boolean;
}

interface MenuItem {
  id: PageType;
  label: string;
  icon: string;
  available: boolean;
  description?: string;
  requiredPlanLabel?: string; // プラン制限の場合に表示するラベル
}

const SidebarMenu: React.FC<SidebarMenuProps> = ({
  isOpen,
  onClose,
  currentPage,
  onPageChange,
  currentPlan,
  userEmail,
  isOffline = false,
}) => {
  const { t } = useTranslation();
  const offlineRestrictLabel = t("nav.offlineRestricted");
  const menuItems: MenuItem[] = [
    {
      id: "home",
      label: t("nav.home"),
      icon: "🏠",
      available: true,
      description: t("nav.homeDesc"),
    },
    {
      id: "quick",
      label: t("nav.quickReading"),
      icon: "✨",
      available: !isOffline,
      description: t("nav.quickReadingDesc"),
      requiredPlanLabel: isOffline ? offlineRestrictLabel : undefined,
    },
    {
      id: "personal",
      label: t("nav.dialogueReading"),
      icon: "💬",
      available: !isOffline && currentPlan === "PREMIUM",
      description: t("nav.dialogueReadingDesc"),
      requiredPlanLabel: isOffline
        ? offlineRestrictLabel
        : currentPlan !== "PREMIUM"
          ? t("home.premiumOnly")
          : undefined,
    },
    {
      id: "clara",
      label: t("nav.offlineReading"),
      icon: "📖",
      available: true,
      description: t("home.offlineDesc"),
    },
    {
      id: "tarotist",
      label: t("nav.tarotists"),
      icon: "👩",
      available: true,
      description: t("nav.tarotistsDesc"),
    },
    {
      id: "plans",
      label: t("nav.plans"),
      icon: "💎",
      available: true,
      description: t("nav.plansDesc"),
    },
    {
      id: "history",
      label: t("nav.history"),
      icon: "📋",
      available: currentPlan !== "GUEST",
      description: t("nav.historyDesc"),
      requiredPlanLabel:
        currentPlan === "GUEST" ? t("nav.requiresFreeAccount") : undefined,
    },
    {
      id: "settings",
      label: t("nav.settings"),
      icon: "⚙️",
      available: true,
      description: t("nav.settingsDesc"),
    },
  ];

  const handleMenuClick = (item: MenuItem) => {
    if (item.available) {
      onPageChange(item.id);
      onClose();
    }
  };

  const PLAN_BADGE_COLOR: Record<string, string> = {
    GUEST: "bg-gray-500",
    FREE: "bg-green-500",
    STANDARD: "bg-blue-500",
    PREMIUM: "bg-purple-500",
  };
  const planBadge = {
    label: getPlanBadgeLabel(currentPlan, t),
    color: PLAN_BADGE_COLOR[currentPlan] ?? "bg-gray-500",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 🔥 オーバーレイ（背景） */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />

          {/* 🔥 サイドバー - drag機能でスワイプ対応 */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            drag="x"
            dragConstraints={{ left: -300, right: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
              // 左に100px以上スワイプまたは速度が一定以上なら閉じる
              if (info.offset.x < -100 || info.velocity.x < -500) {
                onClose();
              }
            }}
            className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-[70] flex flex-col"
          >
            {/* 🔥 ヘッダー部分 */}
            <div
              className="flex justify-between px-3 pb-3 bg-gradient-to-br from-purple-600 to-indigo-600 text-white"
              style={{ paddingTop: "calc(var(--safe-top) + 1.5rem)" }}
            >
              <div className="flex-col items-center justify-between mb-4">
                {/* 🔥 ユーザー情報 */}
                {userEmail && (
                  <div className="text-sm opacity-90 mb-3 truncate">
                    {userEmail}
                  </div>
                )}

                {/* 🔥 プランバッジ */}
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${planBadge.color} text-white`}
                >
                  {t("plans.planBadgeSuffix", { label: planBadge.label })}
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label={t("common.close")}
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* 🔥 メニューリスト */}
            <div className="flex-1 overflow-y-auto py-4">
              {menuItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleMenuClick(item)}
                  disabled={!item.available}
                  className={`w-full px-6 py-4 flex items-center gap-4 transition-colors relative ${
                    !item.available
                      ? "bg-gray-100 cursor-not-allowed"
                      : currentPage === item.id
                        ? "bg-purple-50 border-l-4 border-purple-600"
                        : "hover:bg-gray-50"
                  }`}
                >
                  {/* 🔥 アクティブインジケーター */}
                  {currentPage === item.id && item.available && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600"
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}

                  <span
                    className={`text-2xl ${!item.available ? "grayscale opacity-50" : ""}`}
                  >
                    {item.icon}
                  </span>
                  <div className="flex-1 text-left">
                    <div
                      className={`font-semibold ${
                        !item.available
                          ? "text-gray-400"
                          : currentPage === item.id
                            ? "text-purple-600"
                            : "text-gray-900"
                      }`}
                    >
                      {item.label}
                    </div>
                    {item.description && (
                      <div
                        className={`text-xs mt-0.5 ${!item.available ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {item.description}
                      </div>
                    )}
                  </div>

                  {!item.available &&
                    (item.requiredPlanLabel ? (
                      <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                        🔒 {item.requiredPlanLabel}
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                        {t("nav.comingSoon")}
                      </span>
                    ))}
                </motion.button>
              ))}
            </div>

            {/* 🔥 フッター */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500 text-center">
                {t("nav.footerTagline")}
                <br />
                <div className="flex justify-center items-center gap-4">
                  <span
                    className="font-bold text-xl"
                    style={{
                      fontFamily: "'MonteCarlo', cursive",
                      color: "#87CEEB",
                    }}
                  >
                    Ariadne
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: "#87CEEB" }}
                  >
                    AI Reflection Dialogue
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SidebarMenu;
