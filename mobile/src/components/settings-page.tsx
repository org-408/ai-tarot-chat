import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { ChevronRight, ExternalLink, LogIn, LogOut, Star } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { Plan } from "../../../shared/lib/types";

interface SettingsPageProps {
  isAuthenticated: boolean;
  userEmail?: string;
  currentPlan: Plan;
  onLogin: () => void;
  onLogout: () => void;
  onManageSubscriptions: () => void;
}

const BFF_URL =
  import.meta.env.VITE_BFF_URL || "https://ai-tarot-chat.onrender.com";
const PRIVACY_POLICY_URL =
  import.meta.env.VITE_PRIVACY_POLICY_URL || `${BFF_URL}/privacy`;
const TERMS_URL =
  import.meta.env.VITE_TERMS_URL || `${BFF_URL}/terms`;

// ─── 共通UIパーツ ─────────────────────────────────────────────

const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
  <div className="px-4 pt-6 pb-1">
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
    {right ?? (onClick ? <ChevronRight size={16} className="text-gray-300" /> : null)}
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
}) => {
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

  return (
    <div className="main-container pb-10">
      <div className="page-title pt-3">⚙️ 設定</div>

      {/* ── アカウント ─────────────────── */}
      <SectionHeader label="アカウント" />
      <RowGroup>
        {isAuthenticated && userEmail ? (
          <>
            <Row
              icon={<span className="text-base">👤</span>}
              label={userEmail}
              description={planLabel()}
              right={
                <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                  {currentPlan.name}
                </span>
              }
            />
            <Row
              icon={<LogOut size={16} />}
              label="サインアウト"
              onClick={onLogout}
              danger
            />
          </>
        ) : (
          <>
            <Row
              icon={<span className="text-base">👤</span>}
              label="未サインイン"
              description={planLabel()}
              right={
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                  ゲスト
                </span>
              }
            />
            <Row
              icon={<LogIn size={16} />}
              label="サインイン"
              description="登録・ログインして占いを楽しむ"
              onClick={onLogin}
            />
          </>
        )}
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
          right={
            <span className="text-xs text-gray-400">{appVersion}</span>
          }
        />
      </RowGroup>
    </div>
  );
};

export default SettingsPage;
