"use client";

import { useClientStore } from "@/lib/client/stores/client-store";
import { deleteAccount } from "@/lib/client/services/client-service";
import { useRevenuecat } from "@/lib/client/revenuecat/hooks/use-revenuecat";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useThemePreference } from "@/lib/client/hooks/use-theme";

// ────────────────────────────────────────────
// UI パーツ
// ────────────────────────────────────────────

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1 mb-1.5">
        {title}
      </p>
      <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function SettingsRow({
  label,
  value,
  onClick,
  href,
  danger,
  loading,
}: {
  label: string;
  value?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  const content = (
    <div
      className={[
        "flex items-center justify-between py-3 px-4",
        onClick || href ? "cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors" : "",
        danger ? "text-destructive" : "text-foreground",
        loading ? "opacity-60 pointer-events-none" : "",
      ].join(" ")}
      onClick={onClick}
    >
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1.5">
        {value && <span className="text-sm text-muted-foreground">{value}</span>}
        {(onClick || href) && <span className="text-muted-foreground/50 text-xs">›</span>}
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return content;
}

// プログレスバー付き利用回数行
function UsageRow({
  label,
  used,
  max,
  t,
}: {
  label: string;
  used: number;
  max: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const isUnavailable = max === 0;
  const pct = isUnavailable ? 0 : Math.min(100, (used / max) * 100);

  return (
    <div className="px-4 py-3">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground text-xs">
          {isUnavailable
            ? t("unavailable")
            : t("usageCount", { used, max })}
        </span>
      </div>
      {!isUnavailable && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────
// 削除確認ダイアログ
// ────────────────────────────────────────────

function DeleteAccountDialog({
  open,
  onClose,
  onConfirm,
  loading,
  t,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-foreground mb-2">
          {t("deleteAccountConfirmTitle")}
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {t("deleteAccountConfirmDesc")}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted/50 transition-colors"
            disabled={loading}
          >
            {t("deleteAccountCancel")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-destructive text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "..." : t("deleteAccountConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// メインページ
// ────────────────────────────────────────────

export default function SettingsPage() {
  const t = useTranslations("settings");
  const router = useRouter();
  const locale = useLocale();
  const { data: session } = useSession();
  const { usage, refreshUsage } = useClientStore();
  const { theme, setTheme } = useThemePreference();

  const { openManagement, subscriptionStore, subscriptionStoreLoading } = useRevenuecat();
  const [portalLoading, setPortalLoading] = useState(false);
  const [appStoreDialogOpen, setAppStoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  // ── プラン名バッジ ──
  const planName = usage?.plan?.name ?? "-";
  const planCode = usage?.plan?.code ?? "";

  const planColors: Record<string, string> = {
    PREMIUM: "bg-amber-100 text-amber-700",
    STANDARD: "bg-accent text-accent-foreground",
    FREE: "bg-muted text-muted-foreground",
    GUEST: "bg-muted text-muted-foreground",
  };
  const planBadgeClass = planColors[planCode] ?? planColors.FREE;

  // ── RC サブスク管理 ──
  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      await openManagement();
    } catch {
      // management URL が取れない場合はプランページへ
      router.push("/plans");
    } finally {
      setPortalLoading(false);
    }
  };

  // ── アカウント削除 ──
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await deleteAccount();
      await signOut({ callbackUrl: "/auth/signin" });
    } catch {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // ── 利用回数 ──
  const quickUsed = usage?.dailyReadingsCount ?? 0;
  const quickMax = usage?.plan?.maxReadings ?? 0;
  const personalUsed = usage?.dailyPersonalCount ?? 0;
  const personalMax = usage?.plan?.maxPersonal ?? 0;

  // ── 言語オプション ──
  const LANGUAGES = [
    { code: "ja", label: "日本語" },
    { code: "en", label: "English" },
  ] as const;

  // ── テーマオプション ──
  const THEMES = [
    { value: "light", label: t("themeLight") },
    { value: "dark", label: t("themeDark") },
    { value: "system", label: t("themeSystem") },
  ] as const;

  return (
    <>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">{t("title")}</h1>

        {/* アカウント */}
        <SettingsGroup title={t("account")}>
          <SettingsRow
            label={t("email")}
            value={session?.user?.email ?? t("notSignedIn")}
          />
          <SettingsRow
            label={t("plan")}
            value={
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${planBadgeClass}`}>
                {planName}
              </span>
            }
            onClick={() => router.push("/plans")}
          />
          {session?.user ? (
            <SettingsRow
              label={t("signOut")}
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              danger
            />
          ) : (
            <SettingsRow
              label={t("signIn")}
              onClick={() => router.push("/auth/signin")}
            />
          )}
        </SettingsGroup>

        {/* 利用回数 */}
        <SettingsGroup title={t("usage")}>
          <UsageRow
            label={t("quickReading")}
            used={quickUsed}
            max={quickMax}
            t={t}
          />
          {(usage?.plan?.maxPersonal ?? 0) > 0 || usage?.plan?.maxPersonal === 0 ? (
            <UsageRow
              label={t("personalReading")}
              used={personalUsed}
              max={personalMax}
              t={t}
            />
          ) : null}
          <div className="px-4 py-2">
            <p className="text-[11px] text-muted-foreground">{t("usageResetNote")}</p>
          </div>
        </SettingsGroup>

        {/* サブスクリプション */}
        {session?.user && (
          <SettingsGroup title={t("subscription")}>
            {planCode === "STANDARD" || planCode === "PREMIUM" ? (
              subscriptionStoreLoading ? (
                <SettingsRow label={t("manageSubscription")} loading={true} />
              ) : subscriptionStore === "app_store" ? (
                <SettingsRow
                  label={t("manageSubscription")}
                  onClick={() => setAppStoreDialogOpen(true)}
                />
              ) : (
                <SettingsRow
                  label={t("manageSubscription")}
                  value={portalLoading ? t("portalLoading") : t("manageSubscriptionDesc")}
                  onClick={handlePortal}
                  loading={portalLoading}
                />
              )
            ) : (
              <SettingsRow
                label={t("viewPlans")}
                onClick={() => router.push(`/${locale}/plans`)}
              />
            )}
          </SettingsGroup>
        )}

        {/* 表示設定 */}
        <SettingsGroup title={t("display")}>
          {/* 言語 */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-foreground">{t("language")}</span>
            <div className="flex gap-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => router.push(`/${lang.code}`)}
                  className={[
                    "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                    locale === lang.code
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  ].join(" ")}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
          {/* テーマ */}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-foreground">{t("theme")}</span>
            <div className="flex gap-1">
              {THEMES.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={[
                    "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                    theme === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </SettingsGroup>

        {/* 法的情報 */}
        <SettingsGroup title={t("legal")}>
          <SettingsRow label={t("privacy")} href="/privacy" />
          <SettingsRow label={t("terms")} href="/terms" />
        </SettingsGroup>

        {/* アカウント管理（削除） */}
        {session?.user && (
          <SettingsGroup title={t("danger")}>
            <SettingsRow
              label={t("deleteAccount")}
              onClick={() => setDeleteDialogOpen(true)}
              danger
            />
          </SettingsGroup>
        )}
      </div>

      {/* App Store 管理ダイアログ */}
      {appStoreDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setAppStoreDialogOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-foreground mb-3">
              {t("manageSubscription")}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              {t("manageViaAppStoreDesc")}
            </p>
            <button
              onClick={() => setAppStoreDialogOpen(false)}
              className="w-full py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted/50 transition-colors"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      <DeleteAccountDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteAccount}
        loading={deleteLoading}
        t={t}
      />
    </>
  );
}
