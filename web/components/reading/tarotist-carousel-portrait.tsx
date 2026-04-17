"use client";

import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import type { Plan, Tarotist } from "@shared/lib/types";
import { useRevenuecat } from "@/lib/client/revenuecat/hooks/use-revenuecat";
import { useClientStore } from "@/lib/client/stores/client-store";

interface TarotistCarouselPortraitProps {
  tarotists: Tarotist[];
  selectedTarotist: Tarotist | null;
  onSelect: (tarotist: Tarotist) => void;
  currentPlan?: Plan | null;
}

function PurchaseLoadingOverlay() {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center border border-purple-100/50 relative overflow-hidden"
          style={{ minWidth: "340px", maxWidth: "90vw" }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"
          />
          <div className="relative mb-5">
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full blur-md"
            />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="relative w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg"
            >
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v1a7 7 0 00-7 7h1z" />
              </svg>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="relative z-10"
          >
            <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              プラン変更中
            </div>
            <div className="text-sm text-gray-600 text-center leading-relaxed">
              プランの切り替えを行っています
              <br />
              <span className="text-purple-500 font-medium">このままお待ちください</span>
            </div>
          </motion.div>
          <div className="w-full h-1 bg-gray-200 rounded-full mt-6 overflow-hidden relative z-10">
            <motion.div
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 rounded-full"
              style={{ width: "40%" }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
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
  const { purchase, isUserCancelled } = useRevenuecat();
  const { refreshUsage } = useClientStore();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("carousel");
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

  // 初期選択
  useEffect(() => {
    if (tarotists.length > 0 && !selectedTarotist) {
      onSelect(tarotists[0]);
    }
  }, [tarotists, selectedTarotist, onSelect]);

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

  const purchaseOverlay = upgrading !== null ? <PurchaseLoadingOverlay /> : null;

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
            <div
              className="absolute inset-0 flex items-center justify-center text-8xl pointer-events-none"
              style={{ background: `linear-gradient(135deg, ${primary}cc, ${accent}99)` }}
              aria-hidden="true"
            >
              {selectedTarotist.icon}
            </div>

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
                          className="w-full h-full object-cover object-top"
                          style={{
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

                        {tarotist.plan && (
                          <div
                            className="absolute top-3 right-3 px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-lg"
                            style={{ backgroundColor: accent }}
                          >
                            {tarotist.plan.name}
                          </div>
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
                      <div className="relative flex-[4] p-4 flex flex-col justify-between">
                        <div className="text-center mb-2">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="text-2xl drop-shadow">{tarotist.icon}</span>
                            <h3
                              className="text-xl font-bold drop-shadow"
                              style={{ color: accent, textShadow: "1px 1px 4px rgba(0,0,0,0.8)" }}
                            >
                              {tarotist.name}
                            </h3>
                          </div>
                          <p
                            className="text-xs font-semibold"
                            style={{ color: accent, textShadow: "1px 1px 3px rgba(0,0,0,0.7)" }}
                          >
                            {tarotist.title}
                          </p>
                        </div>

                        <p
                          className="text-center text-xs mb-2 line-clamp-2"
                          style={{ color: accent, textShadow: "1px 1px 3px rgba(0,0,0,0.7)" }}
                        >
                          {tarotist.trait}
                        </p>

                        {tarotist.quality != null && (
                          <div className="text-center text-sm mb-3">
                            {renderStars(tarotist.quality)}
                          </div>
                        )}

                        {available ? (
                          <motion.button
                            type="button"
                            onClick={() => handleGetReading(tarotist)}
                            className="w-full py-2.5 rounded-xl text-white font-bold text-sm shadow-lg"
                            style={{ backgroundColor: accent }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            占ってもらう
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
                              ? "処理中..."
                              : `${tarotist.plan?.name ?? "PREMIUM"}にアップグレード`}
                          </motion.button>
                        )}
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
