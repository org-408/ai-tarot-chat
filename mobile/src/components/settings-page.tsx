import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import {
  BarChart2,
  ChevronRight,
  ExternalLink,
  LogIn,
  LogOut,
  Star,
  Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import type { Plan } from "../../../shared/lib/types";
import UsagePage from "./usage-page";

interface SettingsPageProps {
  isAuthenticated: boolean;
  userEmail?: string;
  currentPlan: Plan;
  onLogin: () => void;
  onLogout: () => void;
  onManageSubscriptions: () => void;
  onDeleteAccount: () => Promise<void>;
}

const BFF_URL =
  import.meta.env.VITE_BFF_URL || "https://ai-tarot-chat.onrender.com";
const PRIVACY_POLICY_URL =
  import.meta.env.VITE_PRIVACY_POLICY_URL || `${BFF_URL}/privacy`;
const TERMS_URL = import.meta.env.VITE_TERMS_URL || `${BFF_URL}/terms`;

// ─── 共通UIパーツ ─────────────────────────────────────────────

const SectionHeader: React.FC<{ label: string; compact?: boolean }> = ({
  label,
  compact,
}) => (
  <div className={`px-4 ${compact ? "pt-1" : "pt-3"} pb-1`}>
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
      {label}
    </p>
  </div>
);

interface RowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

const Row: React.FC<RowProps> = ({
  icon,
  label,
  description,
  right,
  onClick,
  danger = false,
}) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    className={`w-full flex items-center gap-3 px-4 py-3.5 bg-white border-b border-gray-100 last:border-b-0 transition-colors ${
      onClick ? "active:bg-gray-50" : "cursor-default"
    }`}
  >
    <div
      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        danger ? "bg-red-100 text-red-500" : "bg-purple-100 text-purple-600"
      }`}
    >
      {icon}
    </div>
    <div className="flex-1 text-left">
      <p
        className={`text-sm font-medium ${
          danger ? "text-red-500" : "text-gray-900"
        }`}
      >
        {label}
      </p>
      {description && (
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      )}
    </div>
    {right ??
      (onClick ? <ChevronRight size={16} className="text-gray-300" /> : null)}
  </button>
);

const RowGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mx-4 rounded-xl overflow-hidden shadow-sm border border-gray-100">
    {children}
  </div>
);

// ─── 設定ページ本体 ─────────────────────────────────────────────

const SettingsPage: React.FC<SettingsPageProps> = ({
  isAuthenticated,
  userEmail,
  currentPlan,
  onLogin,
  onLogout,
  onManageSubscriptions,
  onDeleteAccount,
}) => {
  const [view, setView] = useState<"main" | "usage">("main");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ネイティブ（iOS/Android）では App.getInfo() でバイナリの実バージョンを取得
  // Web/開発時は vite.config.ts で埋め込んだ package.json のバージョンにフォールバック
  const [appVersion, setAppVersion] = useState<string>(__APP_VERSION__);

  useEffect(() => {
    App.getInfo()
      .then((info) => setAppVersion(info.version))
      .catch(() => {
        // Web環境など getInfo() が使えない場合はビルド時定数のまま
      });
  }, []);

  const openUrl = async (url: string) => {
    await Browser.open({ url });
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await onDeleteAccount();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const planLabel = () => {
    switch (currentPlan.code) {
      case "GUEST":
        return "ゲスト（未登録）";
      case "FREE":
        return `無料プラン`;
      case "STANDARD":
        return `スタンダードプラン`;
      case "PREMIUM":
        return `プレミアムプラン`;
      default:
        return currentPlan.name;
    }
  };

  if (view === "usage") {
    return <UsagePage onBack={() => setView("main")} />;
  }

  return (
    <div className="main-container pb-10">
      <div className="page-title pt-3 !mb-1">⚙️ 設定</div>

      {/* ── アカウント削除確認ダイアログ ─── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-bold text-gray-900 mb-2">
              アカウントを削除しますか？
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              占い履歴などすべてのデータが削除されます。この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 active:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white active:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── アカウント ─────────────────── */}
      <SectionHeader label="アカウント" compact />
      <RowGroup>
        {isAuthenticated && userEmail ? (
          <>
            {/* アカウント情報: バッジ(1行目左) → メルアド(2行目) → プラン名(3行目) */}
            <div className="flex items-start gap-3 px-4 py-3.5 bg-white border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-base">👤</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium mb-1">
                  {currentPlan.name}
                </span>
                <p className="text-sm text-gray-900 truncate">{userEmail}</p>
              </div>
            </div>
            <Row
              icon={<LogOut size={16} />}
              label="サインアウト"
              onClick={onLogout}
              danger
            />
            <Row
              icon={<Trash2 size={16} />}
              label="アカウントを削除"
              description="すべてのデータが削除されます"
              onClick={() => setShowDeleteConfirm(true)}
              danger
            />
          </>
        ) : (
          <>
            {/* アカウント情報: バッジ(1行目左) → 未サインイン(2行目) → プラン名(3行目) */}
            <div className="flex items-start gap-3 px-4 py-3.5 bg-white border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-base">👤</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium mb-1">
                  ゲスト
                </span>
                <p className="text-sm text-gray-900">未サインイン</p>
                <p className="text-xs text-gray-400 mt-0.5">{planLabel()}</p>
              </div>
            </div>
            <Row
              icon={<LogIn size={16} />}
              label="サインイン"
              description="登録・ログインして占いを楽しむ"
              onClick={onLogin}
            />
          </>
        )}
      </RowGroup>

      {/* ── 利用回数 ──────────────────── */}
      <SectionHeader label="利用回数" />
      <RowGroup>
        <Row
          icon={<BarChart2 size={16} />}
          label="今日の利用回数"
          description="クイック占い・パーソナル占いの使用状況"
          onClick={() => setView("usage")}
        />
      </RowGroup>

      {/* ── サブスクリプション ─────────── */}
      <SectionHeader label="サブスクリプション" />
      <RowGroup>
        <Row
          icon={<Star size={16} />}
          label="購入・サブスクリプションの管理"
          description="購入履歴・解約・返金のお問い合わせ"
          onClick={onManageSubscriptions}
        />
      </RowGroup>

      {/* ── 法的情報 ──────────────────── */}
      <SectionHeader label="法的情報" />
      <RowGroup>
        <Row
          icon={<ExternalLink size={16} />}
          label="プライバシーポリシー"
          onClick={() => openUrl(PRIVACY_POLICY_URL)}
        />
        <Row
          icon={<ExternalLink size={16} />}
          label="利用規約"
          onClick={() => openUrl(TERMS_URL)}
        />
      </RowGroup>

      {/* ── アプリ情報 ────────────────── */}
      <SectionHeader label="アプリ情報" />
      <RowGroup>
        <Row
          icon={<span className="text-base">🔮</span>}
          label="AI タロット占い"
          description={`バージョン ${appVersion}`}
          right={<span className="text-xs text-gray-400">{appVersion}</span>}
        />
      </RowGroup>
    </div>
  );
};

export default SettingsPage;
