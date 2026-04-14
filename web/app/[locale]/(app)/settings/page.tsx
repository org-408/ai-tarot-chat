"use client";

import { useClientStore } from "@/lib/client/stores/client-store";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

function SettingsRow({
  label,
  value,
  onClick,
  href,
  danger,
}: {
  label: string;
  value?: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const content = (
    <div
      className={`flex items-center justify-between py-3 px-4 ${onClick || href ? "cursor-pointer hover:bg-gray-50 active:bg-gray-100" : ""} ${danger ? "text-red-600" : "text-gray-800"}`}
      onClick={onClick}
    >
      <span className="text-sm">{label}</span>
      {value && <span className="text-sm text-gray-400">{value}</span>}
      {(onClick || href) && <span className="text-gray-300">›</span>}
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

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 mb-1">
        {title}
      </p>
      <div className="bg-white rounded-2xl border divide-y divide-gray-100 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const { data: session } = useSession();
  const { usage, refreshUsage } = useClientStore();

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  const locale = "ja"; // params を使っても良い

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("title")}</h1>

      {/* アカウント */}
      <SettingsGroup title={t("account")}>
        <SettingsRow
          label={t("email")}
          value={session?.user?.email ?? t("notSignedIn")}
        />
        <SettingsRow
          label={t("plan")}
          value={usage?.plan?.name ?? "-"}
          onClick={() => router.push(`/${locale}/plans`)}
        />
        {session?.user ? (
          <SettingsRow
            label={t("account") + " (サインアウト)"}
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            danger
          />
        ) : (
          <SettingsRow
            label="サインイン"
            onClick={() => router.push("/auth/signin")}
          />
        )}
      </SettingsGroup>

      {/* 利用状況 */}
      {usage && (
        <SettingsGroup title={t("usage")}>
          <SettingsRow
            label={t("todayQuick")}
            value={`${usage.remainingReadings}回`}
          />
          <SettingsRow
            label={t("todayPersonal")}
            value={`${usage.remainingPersonal}回`}
          />
        </SettingsGroup>
      )}

      {/* サブスクリプション */}
      <SettingsGroup title={t("subscription")}>
        <SettingsRow
          label={t("manageSubscription")}
          onClick={() => router.push(`/${locale}/plans`)}
        />
      </SettingsGroup>

      {/* 法的情報 */}
      <SettingsGroup title={t("legal")}>
        <SettingsRow label={t("privacy")} href="/privacy" />
        <SettingsRow label={t("terms")} href="/terms" />
      </SettingsGroup>
    </div>
  );
}
