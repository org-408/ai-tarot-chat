"use client";

import type { Tarotist } from "@shared/lib/types";
import { TarotistInfoDialog } from "@shared/components/tarotist/tarotist-info-dialog";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function TarotistsPage() {
  const t = useTranslations("tarotist");
  const router = useRouter();
  const [selected, setSelected] = useState<Tarotist | null>(null);
  const { init: initMaster, tarotists, isLoading } = useMasterStore();
  const { usage, refreshUsage } = useClientStore();

  useEffect(() => {
    initMaster();
    refreshUsage();
  }, [initMaster, refreshUsage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-16 rounded overflow-hidden border border-gray-200 animate-pulse bg-gray-100" />
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("title")}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {tarotists.map((tarotist) => {
            const primaryColor = tarotist.primaryColor ?? "#7c3aed";
            const accentColor = tarotist.accentColor ?? "#8b5cf6";
            const canUse =
              !tarotist.plan ||
              !usage?.plan ||
              tarotist.plan.no <= usage.plan.no;

            return (
              <motion.button
                key={tarotist.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelected(tarotist)}
                className={`relative rounded-2xl overflow-hidden text-left ${!canUse ? "opacity-70" : ""}`}
              >
                {/* カード画像 */}
                <div
                  className="aspect-[3/4] relative"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}CC, ${accentColor}99)`,
                  }}
                >
                  <img
                    src={`/tarotists/${tarotist.name}.png`}
                    alt={tarotist.name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: "center 15%" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                  {/* プランバッジ */}
                  {tarotist.plan && (
                    <div className="absolute top-2 right-2">
                      <span
                        className="text-white text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ backgroundColor: tarotist.plan.accentColor ?? accentColor }}
                      >
                        {tarotist.plan.name}
                      </span>
                    </div>
                  )}
                  {!canUse && (
                    <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold bg-gray-800/70 px-2 py-1 rounded-full">
                        🔒 {t("locked")}
                      </span>
                    </div>
                  )}
                </div>
                {/* 情報 */}
                <div className="p-2 bg-white border-x border-b border-gray-100 rounded-b-2xl">
                  <p
                    className="font-bold text-sm truncate"
                    style={{ fontFamily: "'MonteCarlo', cursive", color: accentColor }}
                  >
                    {tarotist.icon} {tarotist.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {tarotist.title}
                  </p>
                  {tarotist.trait && (
                    <p
                      className="text-[10px] font-semibold mt-0.5 truncate"
                      style={{ color: accentColor }}
                    >
                      {tarotist.trait}
                    </p>
                  )}
                  {tarotist.quality != null && (
                    <p className="text-[10px] mt-0.5">
                      {"⭐".repeat(tarotist.quality)}
                    </p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <TarotistInfoDialog
            tarotist={selected}
            currentPlan={usage?.plan ?? null}
            onClose={() => setSelected(null)}
            onUpgrade={() => {
              setSelected(null);
              router.push("/plans");
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
