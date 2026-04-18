"use client";

import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import type { Reading } from "@shared/lib/types";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect } from "react";
import { Zap, Sparkles, History } from "lucide-react";

export default function HomeClient() {
  const t = useTranslations("home");
  const tSalon = useTranslations("salon");

  const { init: initMaster } = useMasterStore();
  const { refreshUsage, usage, readings, fetchReadings } = useClientStore();

  useEffect(() => {
    initMaster();
    refreshUsage();
    fetchReadings();
  }, [initMaster, refreshUsage, fetchReadings]);

  const canPersonal = usage == null || (usage.plan?.hasPersonal ?? false);
  const remainingQuick = usage?.remainingReadings;
  const remainingPersonal = usage?.remainingPersonal;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* タイトル + 残り回数 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("subtitle")}</p>
        </div>
        {usage && (
          <div className="flex gap-2 text-xs">
            {remainingQuick !== undefined && (
              <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-100">
                {tSalon("remainingQuick", { count: remainingQuick })}
              </span>
            )}
            {remainingPersonal !== undefined && (
              <span className="bg-pink-50 text-pink-700 px-3 py-1 rounded-full border border-pink-100">
                {tSalon("remainingPersonal", { count: remainingPersonal })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2つのCTA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <span className="text-xs text-gray-400">{tSalon("limitReached")}</span>
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
              <span className="text-xs text-gray-400">{tSalon("limitReached")}</span>
            ) : (
              <Link
                href="/personal"
                className="text-sm font-semibold text-pink-600 hover:underline"
              >
                {t("startPersonal")} →
              </Link>
            )
          ) : (
            <Link
              href="/plans"
              className="text-sm font-semibold text-purple-600 hover:underline"
            >
              {t("upgradeToStart")} →
            </Link>
          )}
        </div>
      </div>

      {/* 最近の占い履歴 */}
      {readings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-700 text-sm">{t("recentHistory")}</h3>
            </div>
            <Link href="/history" className="text-xs text-purple-600 hover:underline">
              {t("viewAll")}
            </Link>
          </div>
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
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {r.tarotist?.name ?? "?"}
                  </span>
                </div>
                {r.category == null && (
                  <span className="text-[10px] bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full">
                    パーソナル
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
        </div>
      )}

      {/* アップグレード案内 */}
      {usage && usage.plan?.code !== "PREMIUM" && (
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-purple-800 text-sm">
              {usage.plan?.code === "GUEST"
                ? tSalon("upgradeGuestTitle")
                : tSalon("upgradeTitle")}
            </p>
            <p className="text-xs text-purple-600 mt-0.5">{tSalon("upgradeDesc")}</p>
          </div>
          <Link
            href="/plans"
            className="shrink-0 px-5 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 shadow hover:opacity-90 transition-opacity"
          >
            {tSalon("upgradeAction")}
          </Link>
        </div>
      )}
    </div>
  );
}
