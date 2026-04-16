"use client";

import type { Plan } from "@shared/lib/types";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useRevenuecat } from "@/lib/client/revenuecat/hooks/use-revenuecat";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export default function PlansPage() {
  const t = useTranslations("plans");
  const { init: initMaster, plans, isLoading } = useMasterStore();
  const { usage, refreshUsage } = useClientStore();
  const { purchase, isUserCancelled } = useRevenuecat();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage]);

  const currentPlanCode = usage?.plan?.code ?? "GUEST";

  const handleSubscribe = async (plan: Plan) => {
    if (plan.code === currentPlanCode) return;
    if (plan.code === "GUEST" || plan.code === "FREE") {
      // 無料プランへのダウングレードは設定ページのサブスク管理から
      return;
    }
    if (plan.code !== "STANDARD" && plan.code !== "PREMIUM") return;

    setCheckoutLoading(plan.code);
    setError(null);
    try {
      await purchase(plan.code);
      await refreshUsage();
    } catch (e) {
      if (!isUserCancelled(e)) {
        setError(t("checkoutError"));
      }
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-4xl animate-pulse">🔮</div>
      </div>
    );
  }

  const orderedPlans = [...plans].sort((a, b) => (a.no ?? 0) - (b.no ?? 0));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("title")}</h1>
        <p className="text-gray-500">
          {t("current")}:{" "}
          <span className="font-semibold text-purple-600">{currentPlanCode}</span>
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {orderedPlans.map((plan) => {
          const isCurrent = plan.code === currentPlanCode;
          const isPaid = plan.code !== "GUEST" && plan.code !== "FREE";
          const isPopular = plan.code === "STANDARD";

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all ${
                isCurrent
                  ? "border-purple-500 shadow-lg"
                  : "border-gray-200 hover:border-purple-300"
              }`}
              style={
                isCurrent
                  ? { borderColor: plan.accentColor ?? "#7c3aed" }
                  : undefined
              }
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {t("popular")}
                  </span>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {t("current")}
                  </span>
                </div>
              )}

              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                style={{
                  background: `linear-gradient(135deg, ${plan.primaryColor ?? "#7c3aed"}, ${plan.accentColor ?? "#8b5cf6"})`,
                }}
              >
                {plan.code === "GUEST"
                  ? "👤"
                  : plan.code === "FREE"
                    ? "🌟"
                    : plan.code === "STANDARD"
                      ? "⭐"
                      : "💎"}
              </div>

              <h3 className="font-bold text-lg text-gray-900 mb-1">
                {plan.name}
              </h3>
              <p className="text-2xl font-bold mb-1">
                {plan.price ? (
                  <>
                    ¥{plan.price.toLocaleString()}
                    <span className="text-sm font-normal text-gray-500">
                      /{t("perMonth")}
                    </span>
                  </>
                ) : (
                  <span className="text-green-600">{t("free")}</span>
                )}
              </p>
              <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

              {plan.features && plan.features.length > 0 && (
                <ul className="space-y-1 mb-6 flex-1">
                  {(plan.features as string[]).map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={() => handleSubscribe(plan)}
                disabled={isCurrent || !!checkoutLoading}
                className={`mt-auto w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isCurrent
                    ? "bg-gray-100 text-gray-400 cursor-default"
                    : isPaid
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {checkoutLoading === plan.code
                  ? t("processing")
                  : isCurrent
                    ? t("current")
                    : t("subscribe")}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        {t("cancelAnytime")}
      </p>
    </div>
  );
}
