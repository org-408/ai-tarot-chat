import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import {
  BarChart2,
  BookOpen,
  ChevronRight,
  ExternalLink,
  Globe,
  LogIn,
  LogOut,
  Star,
  Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Plan } from "../../../shared/lib/types";
import { useClient } from "../lib/hooks/use-client";
import { useLanguage } from "../lib/hooks/use-language";
import { getPlanBadgeLabel, getPlanDisplayName } from "../lib/utils/plan-display";
import type { SupportedLang } from "../i18n";
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
const PRIVACY_POLICY_BASE_URL =
  import.meta.env.VITE_PRIVACY_POLICY_URL || `${BFF_URL}/privacy`;
const TERMS_BASE_URL = import.meta.env.VITE_TERMS_URL || `${BFF_URL}/terms`;

// 現在のアプリ内言語を ?lang= クエリで Web 側に伝達する。
// OS の Accept-Language とは独立してアプリ内で言語を切り替えられるようにするため、
// 起動時に固定するのではなく開く時点で組み立てる。
function buildUrlWithLang(baseUrl: string, lang: SupportedLang): string {
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}lang=${lang}`;
}

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
  const { t } = useTranslation();
  const { lang, setLang } = useLanguage();
  const [view, setView] = useState<"main" | "usage">("main");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTutorialToast, setShowTutorialToast] = useState(false);
  const { resetOnboarding } = useClient();

  const handleReplayTutorial = async () => {
    // トースト表示中は連打防止（タイムアウトでフラグが落ちるまでロック）
    if (showTutorialToast) return;
    setShowTutorialToast(true);
    setTimeout(() => setShowTutorialToast(false), 2500);
    await resetOnboarding();
  };

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

  const planLabel = () => getPlanDisplayName(currentPlan.code, t, currentPlan.name);
  const planBadgeLabel = () => getPlanBadgeLabel(currentPlan.code, t, currentPlan.name);

  if (view === "usage") {
    return <UsagePage onBack={() => setView("main")} />;
  }

  return (
    <div className="main-container pb-10">
      <div className="page-title pt-3 !mb-1">{t("settings.pageTitle")}</div>

      {/* ── アカウント削除確認ダイアログ ─── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-bold text-gray-900 mb-2">
              {t("settings.deleteAccountConfirmTitle")}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {t("settings.deleteAccountConfirmBody")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 active:bg-gray-50 disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white active:bg-red-600 disabled:opacity-50"
              >
                {isDeleting
                  ? t("settings.deleting")
                  : t("settings.deleteAction")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── アカウント ─────────────────── */}
      <SectionHeader label={t("settings.sectionAccount")} compact />
      <RowGroup>
        {isAuthenticated && userEmail ? (
          <>
            {/* アカウント情報 */}
            <div className="flex items-start gap-3 px-4 py-3.5 bg-white border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-base">👤</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium mb-1">
                  {planBadgeLabel()}
                </span>
                <p className="text-sm text-gray-900 truncate">{userEmail}</p>
              </div>
            </div>
            <Row
              icon={<LogOut size={16} />}
              label={t("auth.signOut")}
              onClick={onLogout}
              danger
            />
          </>
        ) : (
          <>
            {/* アカウント情報: 未サインイン */}
            <div className="flex items-start gap-3 px-4 py-3.5 bg-white border-b border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-base">👤</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium mb-1">
                  {t("auth.guest")}
                </span>
                <p className="text-sm text-gray-900">
                  {t("auth.notSignedIn")}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{planLabel()}</p>
              </div>
            </div>
            <Row
              icon={<LogIn size={16} />}
              label={t("auth.signIn")}
              description={t("auth.signInDesc")}
              onClick={onLogin}
            />
          </>
        )}
      </RowGroup>

      {/* ── 言語 ─────────────────── */}
      <SectionHeader label={t("settings.sectionLanguage")} />
      <RowGroup>
        <div className="px-4 py-3 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Globe size={16} />
            </div>
            <p className="text-sm font-medium text-gray-900">
              {t("settings.languageLabel")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["ja", "en"] as SupportedLang[]).map((code) => {
              const isActive = lang === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => void setLang(code)}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors border ${
                    isActive
                      ? "bg-purple-600 border-purple-600 text-white"
                      : "bg-white border-gray-200 text-gray-700 active:bg-gray-50"
                  }`}
                >
                  {code === "ja" ? t("settings.langJa") : t("settings.langEn")}
                </button>
              );
            })}
          </div>
        </div>
      </RowGroup>

      {/* ── 利用回数 ──────────────────── */}
      <SectionHeader label={t("settings.sectionUsage")} />
      <RowGroup>
        <Row
          icon={<BarChart2 size={16} />}
          label={t("settings.todayUsage")}
          description={t("settings.todayUsageDesc")}
          onClick={() => setView("usage")}
        />
      </RowGroup>

      {/* ── サブスクリプション ─────────── */}
      <SectionHeader label={t("settings.sectionSubscription")} />
      <RowGroup>
        <Row
          icon={<Star size={16} />}
          label={t("settings.manageSubscription")}
          description={t("settings.manageSubscriptionDesc")}
          onClick={onManageSubscriptions}
        />
      </RowGroup>

      {/* ── チュートリアル ─────────────── */}
      <SectionHeader label={t("settings.sectionTutorial")} />
      <RowGroup>
        <Row
          icon={<BookOpen size={16} />}
          label={t("settings.replayTutorial")}
          description={t("settings.replayTutorialDesc")}
          onClick={handleReplayTutorial}
        />
      </RowGroup>

      {/* チュートリアルリセット完了トースト */}
      {showTutorialToast && (
        <div className="fixed left-1/2 bottom-24 -translate-x-1/2 z-50 bg-gray-900/90 text-white text-xs px-4 py-2 rounded-full shadow-lg">
          {t("settings.tutorialReplayToast")}
        </div>
      )}

      {/* ── 法的情報 ──────────────────── */}
      <SectionHeader label={t("settings.sectionLegal")} />
      <RowGroup>
        <Row
          icon={<ExternalLink size={16} />}
          label={t("settings.privacyPolicy")}
          onClick={() => openUrl(buildUrlWithLang(PRIVACY_POLICY_BASE_URL, lang))}
        />
        <Row
          icon={<ExternalLink size={16} />}
          label={t("settings.termsOfUse")}
          onClick={() => openUrl(buildUrlWithLang(TERMS_BASE_URL, lang))}
        />
      </RowGroup>

      {/* ── アプリ情報 ────────────────── */}
      <SectionHeader label={t("settings.sectionApp")} />
      <RowGroup>
        <Row
          icon={<span className="text-base">✨</span>}
          label={t("settings.appName")}
          description={t("settings.version", { version: appVersion })}
          right={<span className="text-xs text-gray-400">{appVersion}</span>}
        />
      </RowGroup>

      {/* ── アカウント管理 ────────────── */}
      {isAuthenticated && (
        <>
          <SectionHeader label={t("settings.sectionAccountManagement")} />
          <RowGroup>
            <Row
              icon={<Trash2 size={16} />}
              label={t("settings.deleteAccount")}
              description={t("settings.deleteAccountDesc")}
              onClick={() => setShowDeleteConfirm(true)}
              danger
            />
          </RowGroup>
        </>
      )}
    </div>
  );
};

export default SettingsPage;
