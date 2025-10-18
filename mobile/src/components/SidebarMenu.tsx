import { AnimatePresence, motion } from "framer-motion";
import type { PageType } from "../types";

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  currentPlan: string;
  userEmail?: string;
}

interface MenuItem {
  id: PageType;
  label: string;
  icon: string;
  available: boolean;
  description?: string;
}

const SidebarMenu: React.FC<SidebarMenuProps> = ({
  isOpen,
  onClose,
  currentPage,
  onPageChange,
  currentPlan,
  userEmail,
}) => {
  const menuItems: MenuItem[] = [
    {
      id: "salon",
      label: "占い",
      icon: "🔮",
      available: true,
      description: "タロット占いを始める",
    },
    {
      id: "tarotist",
      label: "占い師",
      icon: "👩",
      available: true,
      description: "占い師を見る",
    },
    {
      id: "tarotistSwipe",
      label: "占い師選択",
      icon: "👱‍♀️",
      available: true,
      description: "スワイプで占い師を選ぶ",
    },
    {
      id: "plans",
      label: "プラン",
      icon: "💎",
      available: true,
      description: "プランを変更する",
    },
    {
      id: "history",
      label: "履歴",
      icon: "📋",
      available: false,
      description: "過去の占い結果",
    },
    {
      id: "settings",
      label: "設定",
      icon: "⚙️",
      available: true,
      description: "アプリ設定",
    },
  ];

  const handleMenuClick = (item: MenuItem) => {
    if (item.available) {
      onPageChange(item.id);
      onClose();
    }
  };

  const getPlanBadge = () => {
    switch (currentPlan) {
      case "GUEST":
        return { label: "ゲスト", color: "bg-gray-500" };
      case "FREE":
        return { label: "無料", color: "bg-green-500" };
      case "STANDARD":
        return { label: "スタンダード", color: "bg-blue-500" };
      case "PREMIUM":
        return { label: "プレミアム", color: "bg-purple-500" };
      default:
        return { label: "未設定", color: "bg-gray-500" };
    }
  };

  const planBadge = getPlanBadge();

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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
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
            className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* 🔥 ヘッダー部分 */}
            <div className="px-6 py-6 bg-gradient-to-br from-purple-600 to-indigo-600 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">メニュー</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
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
                {planBadge.label}プラン
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
                    currentPage === item.id
                      ? "bg-purple-50 border-l-4 border-purple-600"
                      : "hover:bg-gray-50"
                  } ${!item.available ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {/* 🔥 アクティブインジケーター */}
                  {currentPage === item.id && (
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

                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1 text-left">
                    <div
                      className={`font-semibold ${
                        currentPage === item.id
                          ? "text-purple-600"
                          : "text-gray-900"
                      }`}
                    >
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </div>

                  {!item.available && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      準備中
                    </span>
                  )}
                </motion.button>
              ))}
            </div>

            {/* 🔥 フッター */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500 text-center">
                タロット占いアプリ
                <br />
                <span className="text-purple-600 font-semibold">
                  Tarot Reader
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SidebarMenu;
