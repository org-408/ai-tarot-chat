"use client";

import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useRevenuecat } from "@/lib/client/revenuecat/hooks/use-revenuecat";
import type { Reading } from "@shared/lib/types";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { History, Sparkles, Zap } from "lucide-react";

export default function HomeClient() {
  const t = useTranslations("home");
  const tSalon = useTranslations("salon");

  const { init: initMaster } = useMasterStore();
  const { refreshUsage, usage, readings, fetchReadings } = useClientStore();
  const { purchase, isUserCancelled } = useRevenuecat();
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    initMaster();
    refreshUsage();
    fetchReadings();
  }, [initMaster, refreshUsage, fetchReadings]);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      await purchase("PREMIUM");
      await refreshUsage();
    } catch (e) {
      if (!isUserCancelled(e)) {
        window.location.href = "/plans";
      }
    } finally {
      setIsUpgrading(false);
    }
  };

  const plan = usage?.plan;
  const canPersonal = usage == null || (plan?.hasPersonal ?? false);
  const hasHistory = plan?.hasHistory ?? true;
  const remainingQuick = usage?.remainingReadings;
  const remainingPersonal = usage?.remainingPersonal;
  const maxQuick = plan?.maxReadings;
  const maxPersonal = plan?.maxPersonal;
  const isPremium = plan?.code === "PREMIUM" || plan?.code === "MASTER";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* タイトル */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          {t("title")}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
      </div>

      {/* 今日の残り回数 */}
      {usage && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            {t("todayUsage")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {/* クイック */}
            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-700">
                  {t("quickTitle")}
                </span>
              </div>
              {remainingQuick !== undefined && maxQuick !== undefined ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-purple-700">
                    {remainingQuick}
                  </span>
                  <span className="text-sm text-gray-400">
                    / {maxQuick} {t("countUnit")}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-gray-400">—</div>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                {t("resetNote")}
              </p>
            </div>

            {/* パーソナル */}
            <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-pink-600" />
                <span className="text-xs font-medium text-pink-700">
                  {t("personalTitle")}
                </span>
              </div>
              {canPersonal &&
              remainingPersonal !== undefined &&
              maxPersonal !== undefined &&
              maxPersonal > 0 ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-pink-700">
                    {remainingPersonal}
                  </span>
                  <span className="text-sm text-gray-400">
                    / {maxPersonal} {t("countUnit")}
                  </span>
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  {t("premiumOnly")}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                {canPersonal && maxPersonal && maxPersonal > 0
                  ? t("resetNote")
                  : t("upgradeHint")}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 2つのCTA */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* クイック占い */}
        <Link
          href="/simple"
          className="group relative bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-shadow flex flex-col gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">{t("quickTitle")}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t("quickDesc")}</p>
          </div>
          {remainingQuick !== undefined && remainingQuick === 0 ? (
            <span className="text-xs text-gray-400">
              {tSalon("limitReached")}
            </span>
          ) : (
            <span className="text-sm font-semibold text-purple-600 group-hover:underline">
              {t("startQuick")} →
            </span>
          )}
        </Link>

        {/* パーソナル占い */}
        <div className="relative bg-white rounded-2xl shadow-sm border p-5 flex flex-col gap-3">
          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">{t("personalTitle")}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t("personalDesc")}</p>
          </div>
          {canPersonal ? (
            remainingPersonal !== undefined && remainingPersonal === 0 ? (
              <span className="text-xs text-gray-400">
                {tSalon("limitReached")}
              </span>
            ) : (
              <Link
                href="/personal"
                className="text-sm font-semibold text-pink-600 hover:underline"
              >
                {t("startPersonal")} →
              </Link>
            )
          ) : (
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="text-sm font-semibold text-purple-600 hover:underline disabled:opacity-50 text-left"
            >
              {isUpgrading ? t("upgrading") : `${t("upgradeToStart")} →`}
            </button>
          )}
        </div>
      </section>

      {/* 最近の占い履歴 */}
      {usage && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-700 text-sm">
                {t("recentHistory")}
              </h3>
            </div>
            {hasHistory && readings.length > 0 && (
              <Link
                href="/history"
                className="text-xs text-purple-600 hover:underline"
              >
                {t("viewAll")}
              </Link>
            )}
          </div>

          {!hasHistory ? (
            // プランが履歴保存をサポートしていない (GUEST)
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-5 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-gray-500">
                {t("historyPlanRequired")}
              </p>
              <Link
                href="/plans"
                className="shrink-0 text-xs font-semibold text-purple-600 hover:underline"
              >
                {t("viewPlans")} →
              </Link>
            </div>
          ) : readings.length === 0 ? (
            // 履歴対応プランだが履歴ゼロ
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-5 text-center">
              <p className="text-xs text-gray-500">{t("historyEmpty")}</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {readings.slice(0, 5).map((r: Reading) => (
                <Link
                  key={r.id}
                  href={`/history/${r.id}`}
                  className="flex-shrink-0 w-36 bg-white rounded-xl border p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-purple-100">
                      <img
                        src={`/tarotists/${r.tarotist?.name}.png`}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 truncate">
                      {r.tarotist?.name ?? "?"}
                    </span>
                  </div>
                  {r.category == null && (
                    <span className="text-[10px] bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full">
                      {t("personalBadge")}
                    </span>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(r.createdAt).toLocaleDateString("ja-JP", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* アップグレード案内 (非プレミアム時のみ) */}
      {usage && !isPremium && (
        <section className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-purple-800 text-sm">
              {plan?.code === "GUEST"
                ? tSalon("upgradeGuestTitle")
                : tSalon("upgradeTitle")}
            </p>
            <p className="text-xs text-purple-600 mt-0.5">
              {tSalon("upgradeDesc")}
            </p>
          </div>
          <Link
            href="/plans"
            className="shrink-0 px-5 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow hover:opacity-90 transition-opacity"
          >
            {tSalon("upgradeAction")}
          </Link>
        </section>
      )}
    </div>
  );
}
