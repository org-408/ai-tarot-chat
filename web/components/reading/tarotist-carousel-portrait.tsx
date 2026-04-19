"use client";

import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { Plan, Tarotist } from "@shared/lib/types";
import { useRevenuecat } from "@/lib/client/revenuecat/hooks/use-revenuecat";
import { useClientStore } from "@/lib/client/stores/client-store";
import { PurchaseLoadingOverlay } from "@shared/components/ui/purchase-loading-overlay";

interface TarotistCarouselPortraitProps {
  tarotists: Tarotist[];
  selectedTarotist: Tarotist | null;
  onSelect: (tarotist: Tarotist) => void;
  currentPlan?: Plan | null;
}

const canUse = (tarotist: Tarotist, currentPlan: Plan | null | undefined): boolean => {
  if (!currentPlan || !tarotist.plan) return true;
  return tarotist.plan.no <= currentPlan.no;
};

const renderStars = (quality: number | null | undefined) =>
  "⭐️".repeat(quality ?? 0);

type Mode = "carousel" | "portrait";

export function TarotistCarouselPortrait({
  tarotists,
  selectedTarotist,
  onSelect,
  currentPlan,
}: TarotistCarouselPortraitProps) {
  const tTarotist = useTranslations("tarotist");
  const tPlans = useTranslations("plans");
  const { purchase, isUserCancelled } = useRevenuecat();
  const { refreshUsage } = useClientStore();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  // 既に占い師が選択されていればポートレートモードで開く（モバイル同等）
  const [mode, setMode] = useState<Mode>(
    selectedTarotist ? "portrait" : "carousel",
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    skipSnaps: false,
  });

  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  const onEmblaSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    onSelect(tarotists[index]);
  }, [emblaApi, tarotists, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onEmblaSelect);
    return () => { emblaApi.off("select", onEmblaSelect); };
  }, [emblaApi, onEmblaSelect]);

  // selectedTarotist が外から変わったらカルーセルを同期
  useEffect(() => {
    if (!emblaApi || !selectedTarotist) return;
    const idx = tarotists.findIndex((t) => t.id === selectedTarotist.id);
    if (idx !== -1 && idx !== emblaApi.selectedScrollSnap()) {
      emblaApi.scrollTo(idx, true);
    }
  }, [emblaApi, selectedTarotist, tarotists]);

  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const handleGetReading = (tarotist: Tarotist) => {
    onSelect(tarotist);
    setMode("portrait");
  };

  const handleUpgrade = async (tarotist: Tarotist) => {
    const planCode = tarotist.plan?.code;
    if (planCode !== "STANDARD" && planCode !== "PREMIUM") return;
    setUpgrading(tarotist.id);
    try {
      await purchase(planCode);
      await refreshUsage();
    } catch (e) {
      if (!isUserCancelled(e)) console.error(e);
    } finally {
      setUpgrading(null);
    }
  };

  if (tarotists.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        占い師が見つかりませんでした
      </div>
    );
  }

  const purchaseOverlay =
    upgrading !== null ? (
      <PurchaseLoadingOverlay
        labels={{
          title: tPlans("changingPlanTitle"),
          line1: tPlans("changingPlanLine1"),
          line2: tPlans("changingPlanLine2"),
        }}
      />
    ) : null;

  // ── ポートレートモード ──
  if (mode === "portrait" && selectedTarotist) {
    const accent = selectedTarotist.accentColor ?? "#a78bfa";
    const primary = selectedTarotist.primaryColor ?? "#7c3aed";

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="portrait"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.35 }}
          className="w-full h-full p-2"
        >
          <div className="h-full rounded-3xl overflow-hidden shadow-xl relative">
            {/* ポートレート全面 */}
            <img
              src={`/tarotists/${selectedTarotist.name}.png`}
              alt={selectedTarotist.name}
              className="w-full h-full object-cover"
              style={{ objectPosition: "center 20%" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />

            {/* 画像エラー時フォールバック */}
            {imgErrors.has(selectedTarotist.id) && (
              <div
                className="absolute inset-0 flex items-center justify-center text-8xl pointer-events-none"
                style={{ background: `linear-gradient(135deg, ${primary}cc, ${accent}99)` }}
                aria-hidden="true"
              >
                {selectedTarotist.icon}
              </div>
            )}

            {/* 下部グラデーション */}
            <div
              className="absolute inset-x-0 bottom-0 h-48"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }}
            />

            {/* 名前・特徴 */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl drop-shadow-lg">{selectedTarotist.icon}</span>
                <h2
                  className="text-2xl font-bold drop-shadow-lg"
                  style={{ color: accent, textShadow: "2px 2px 6px rgba(0,0,0,0.9)" }}
                >
                  {selectedTarotist.name}
                </h2>
              </div>
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: accent, textShadow: "1px 1px 4px rgba(0,0,0,0.9)" }}
              >
                {selectedTarotist.title}
              </p>
              <p
                className="text-xs"
                style={{ color: accent, textShadow: "1px 1px 3px rgba(0,0,0,0.9)" }}
              >
                {selectedTarotist.trait}
              </p>
            </div>

            {/* 占い師を変更ボタン */}
            <button
              type="button"
              onClick={() => setMode("carousel")}
              className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/20 hover:bg-white/50 text-white transition-all shadow-md backdrop-blur-sm"
            >
              占い師を変更
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── カルーセルモード ──
  return (
    <>
    {purchaseOverlay}
    <AnimatePresence mode="wait">
      <motion.div
        key="carousel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="relative flex flex-col h-full overflow-hidden"
      >
        {/* スワイプヒント */}
        <motion.div
          className="text-center py-3 flex-shrink-0"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          <span className="text-gray-700 bg-white/70 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm text-xs">
            ← 占い師を選んでください →
          </span>
        </motion.div>

        {/* カルーセル本体 */}
        <div className="flex-1 overflow-hidden min-h-0" ref={emblaRef}>
          <div className="flex h-full touch-pan-y">
            {tarotists.map((tarotist, index) => {
              const available = canUse(tarotist, currentPlan);
              const isActive = index === selectedIndex;
              const primary = tarotist.primaryColor ?? "#7c3aed";
              const secondary = tarotist.secondaryColor ?? "#8b5cf6";
              const accent = tarotist.accentColor ?? "#a78bfa";

              return (
                <div key={tarotist.id} className="flex-[0_0_100%] min-w-0 px-6 h-full">
                  <motion.div
                    animate={{ scale: isActive ? 1 : 0.88 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="h-full flex items-center justify-center"
                  >
                    <div
                      className="relative w-full max-w-sm h-full rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                      style={{
                        background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
                        border: `3px solid ${secondary}`,
                      }}
                    >
                      {/* 画像エリア（上 60%） */}
                      <div className="relative flex-[6] overflow-hidden">
                        <img
                          src={`/tarotists/${tarotist.name}.png`}
                          alt={tarotist.name}
                          className="w-full h-full object-cover"
                          style={{
                            objectPosition: "center 20%",
                            filter: available ? "none" : "grayscale(70%) brightness(0.7)",
                          }}
                          onError={() =>
                            setImgErrors((prev) => new Set(prev).add(tarotist.id))
                          }
                        />

                        {imgErrors.has(tarotist.id) && (
                          <div className="absolute inset-0 flex items-center justify-center text-6xl">
                            {tarotist.icon}
                          </div>
                        )}

                        {tarotist.provider === "OFFLINE" ? (
                          <div
                            className="absolute top-3 right-3 px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-lg"
                            style={{ backgroundColor: accent }}
                          >
                            {tTarotist("alwaysAvailable")}
                          </div>
                        ) : (
                          tarotist.plan && (
                            <div
                              className="absolute top-3 right-3 px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-lg"
                              style={{ backgroundColor: accent }}
                            >
                              {tarotist.plan.name}
                            </div>
                          )
                        )}

                        {isActive && (
                          <motion.div
                            className="absolute top-3 left-3 w-2.5 h-2.5 bg-green-400 rounded-full shadow-lg"
                            animate={{ scale: [1, 1.4, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                          />
                        )}
                      </div>

                      {/* 情報エリア（下 40%） */}
                      <div className="relative flex-[4] p-4 flex flex-col justify-between bg-white/95 backdrop-blur-sm">
                        <div className="text-center mb-2">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="text-2xl">{tarotist.icon}</span>
                            <h3 className="text-xl font-bold text-gray-900">
                              {tarotist.name}
                            </h3>
                          </div>
                          <p className="text-xs font-semibold text-gray-700">
                            {tarotist.title}
                          </p>
                        </div>

                        <p className="text-center text-xs mb-2 text-gray-700">
                          {tarotist.trait}
                        </p>

                        <p className="text-center text-xs text-gray-800 mb-2 leading-relaxed whitespace-pre-wrap">
                          {tarotist.bio}
                        </p>

                        {tarotist.quality != null && (
                          <div className="text-center text-sm mb-3">
                            {renderStars(tarotist.quality)}
                          </div>
                        )}

                        {tarotist.provider !== "OFFLINE" &&
                          (available ? (
                            <motion.button
                              type="button"
                              onClick={() => handleGetReading(tarotist)}
                              className="w-full py-2.5 rounded-xl text-white font-bold text-sm shadow-lg"
                              style={{ backgroundColor: accent }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              {tTarotist("getReading")}
                            </motion.button>
                          ) : (
                            <motion.button
                              type="button"
                              onClick={() => handleUpgrade(tarotist)}
                              disabled={upgrading === tarotist.id}
                              className="w-full py-2.5 rounded-xl text-white font-bold text-sm shadow-lg disabled:opacity-60"
                              style={{ backgroundColor: accent }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              {upgrading === tarotist.id
                                ? tTarotist("processing")
                                : tTarotist("upgradeToPlan", {
                                    plan: tarotist.plan?.name ?? "PREMIUM",
                                  })}
                            </motion.button>
                          ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 前後ボタン */}
        <button
          type="button"
          onClick={scrollPrev}
          className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg z-10 transition-all"
          aria-label="前の占い師"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={scrollNext}
          className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg z-10 transition-all"
          aria-label="次の占い師"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* ドットインジケーター */}
        <div className="flex items-center justify-center gap-2 py-3 flex-shrink-0">
          {scrollSnaps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              className={`rounded-full transition-all ${
                i === selectedIndex ? "w-6 h-2.5 bg-purple-500" : "w-2.5 h-2.5 bg-gray-300"
              }`}
              aria-label={`占い師 ${i + 1}`}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
    </>
  );
}
