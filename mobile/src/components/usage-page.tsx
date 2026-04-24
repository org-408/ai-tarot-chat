import { BarChart2, ChevronLeft } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useClient } from "../lib/hooks/use-client";

interface UsagePageProps {
  onBack: () => void;
}

const UsagePage: React.FC<UsagePageProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { usage, refreshUsage } = useClient();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    refreshUsage().finally(() => setIsLoading(false));
  }, [refreshUsage]);

  const plan = usage?.plan;

  const rows = [
    {
      label: t("home.quickReading"),
      used: usage?.dailyReadingsCount ?? 0,
      max: plan?.maxReadings ?? 0,
    },
    {
      label: t("home.dialogueReading"),
      used: usage?.dailyPersonalCount ?? 0,
      max: plan?.maxPersonal ?? 0,
      disabled: !plan?.hasPersonal,
    },
  ];

  return (
    <div className="main-container pb-10">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full active:bg-gray-100"
          aria-label={t("common.back")}
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-base font-semibold text-gray-900">
          {t("settings.sectionUsage")}
        </h1>
      </div>

      {isLoading ? (
        /* スケルトン */
        <>
          <div className="mx-4 mb-4 h-16 bg-gray-100 rounded-xl animate-pulse" />
          <div className="px-4 pt-2 pb-1">
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="mx-4 rounded-xl overflow-hidden border border-gray-100">
            {[0, 1].map((i) => (
              <div key={i} className={`bg-white px-4 py-4 ${i === 0 ? "border-b border-gray-100" : ""}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse" />
                    <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* プラン */}
          {plan && (
            <div className="mx-4 mb-4 px-4 py-3 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-xs text-purple-500 font-medium">
                {t("plans.currentPlan")}
              </p>
              <p className="text-sm font-semibold text-purple-800 mt-0.5">{plan.name}</p>
            </div>
          )}

          {/* 利用回数 */}
          <div className="px-4 pt-2 pb-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t("settings.todayUsageStatus")}
            </p>
          </div>
          <div className="mx-4 rounded-xl overflow-hidden shadow-sm border border-gray-100">
            {rows.map((row, i) => (
              <div
                key={row.label}
                className={`bg-white px-4 py-4 ${i < rows.length - 1 ? "border-b border-gray-100" : ""} ${row.disabled ? "opacity-40" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                      <BarChart2 size={14} className="text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">{row.label}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    {row.disabled ? (
                      <span className="text-xs text-gray-400">
                        {t("plans.notSupportedByPlan")}
                      </span>
                    ) : row.max === 0 ? (
                      <span className="text-xs text-gray-400">
                        {t("plans.unlimited")}
                      </span>
                    ) : (
                      <span>
                        <span className="text-purple-600">{row.used}</span>
                        <span className="text-gray-400"> / {row.max}</span>
                      </span>
                    )}
                  </p>
                </div>
                {!row.disabled && row.max > 0 && (
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (row.used / row.max) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="mx-4 mt-3 text-xs text-gray-400">
            {t("settings.usageResetNotice")}
          </p>
        </>
      )}
    </div>
  );
};

export default UsagePage;
