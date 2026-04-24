"use client";

import { PurchaseLoadingOverlay } from "@shared/components/ui/purchase-loading-overlay";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useRevenuecat } from "@/lib/client/revenuecat/hooks/use-revenuecat";
import type { Reading } from "@shared/lib/types";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { History, Sparkles, Star, Zap } from "lucide-react";

const PLAN_POLL_INTERVAL_MS = 1000;
const PLAN_POLL_MAX_ATTEMPTS = 10;

export default function HomeClient() {
  const t = useTranslations("home");
  const tSalon = useTranslations("salon");
  const tPlans = useTranslations("plans");
  const router = useRouter();

  const { init: initMaster } = useMasterStore();
  const { refreshUsage, usage, readings, fetchReadings } = useClientStore();
  const { purchase, isUserCancelled } = useRevenuecat();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  useEffect(() => {
    initMaster();
    refreshUsage();
    fetchReadings();
  }, [initMaster, refreshUsage, fetchReadings]);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    setUpgradeError(null);
    try {
      await purchase("PREMIUM");
      // プラン反映をポーリングで確認（RC webhook 遅延対策）
      for (let i = 0; i < PLAN_POLL_MAX_ATTEMPTS; i++) {
        await refreshUsage();
        if (useClientStore.getState().usage?.plan?.code === "PREMIUM") break;
        await new Promise((r) => setTimeout(r, PLAN_POLL_INTERVAL_MS));
      }
      router.push("/personal");
    } catch (e) {
      // キャンセルはサイレント。失敗は現在地(/)維持のままインラインエラー表示。
      // 詳細: docs/plan-change-navigation-spec.md 2-2 a / .claude/rules/plan-change-navigation.md
      if (!isUserCancelled(e)) {
        setUpgradeError(tPlans("checkoutError"));
      }
    } finally {
      setIsUpgrading(false);
    }
  };

  const plan = usage?.plan;
  const canPersonal = usage == null || (plan?.hasPersonal ?? false);
  const remainingQuick = usage?.remainingReadings;
  const remainingPersonal = usage?.remainingPersonal;
  const maxQuick = plan?.maxReadings;
  const maxPersonal = plan?.maxPersonal;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {isUpgrading && (
        <PurchaseLoadingOverlay
          labels={{
            title: tPlans("changingPlanTitle"),
            line1: tPlans("changingPlanLine1"),
            line2: tPlans("changingPlanLine2"),
          }}
        />
      )}
      {upgradeError && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 text-center"
          role="alert"
        >
          {upgradeError}
        </div>
      )}
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
              {isUpgrading ? t("upgrading") : `${t("upgradeToPremium")} →`}
            </button>
          )}
        </div>
      </section>

      {/* 占い師を見る */}
      <section>
        <Link
          href="/tarotists"
          className="group relative bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">{t("tarotistsTitle")}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{t("tarotistsDesc")}</p>
          </div>
          <span className="text-sm font-semibold text-amber-600 group-hover:underline">
            {t("viewAll")} →
          </span>
        </Link>
      </section>

      {/* 最近の占い履歴 */}
      {usage && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-700 text-base">
                {t("recentHistory")}
              </h3>
            </div>
            {readings.length > 0 && (
              <Link
                href="/history"
                className="text-sm text-purple-600 hover:underline"
              >
                {t("viewAll")}
              </Link>
            )}
          </div>

          {readings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-5 text-center">
              <p className="text-sm text-gray-500">{t("historyEmpty")}</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {readings.slice(0, 5).map((r: Reading) => {
                const isPersonal = !!r.customQuestion;
                const mainText = isPersonal
                  ? r.customQuestion
                  : r.category?.name;
                return (
                  <Link
                    key={r.id}
                    href={`/history/${r.id}`}
                    className="flex-shrink-0 w-48 bg-white rounded-xl border p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-purple-100">
                        <img
                          src={`/tarotists/${r.tarotist?.name}.png`}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none";
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {r.tarotist?.name ?? "?"}
                      </span>
                    </div>
                    {mainText && (
                      <p className="text-sm font-medium text-gray-800 truncate leading-tight">
                        {mainText}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {r.spread?.name && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {r.spread.name}
                        </span>
                      )}
                      {isPersonal && (
                        <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                          {t("personalBadge")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-end mt-1.5">
                      <span className="text-xs text-gray-400">
                        {new Date(r.createdAt).toLocaleDateString("ja-JP", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

    </div>
  );
}
