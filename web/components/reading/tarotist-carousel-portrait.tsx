"use client";

import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import type { Plan, Tarotist } from "@shared/lib/types";

interface TarotistCarouselPortraitProps {
  tarotists: Tarotist[];
  selectedTarotist: Tarotist | null;
  onSelect: (tarotist: Tarotist) => void;
  currentPlan?: Plan | null;
  onUpgrade: (planCode: string) => void;
}

const canUse = (tarotist: Tarotist, currentPlan: Plan | null | undefined): boolean => {
  if (!currentPlan || !tarotist.plan) return true;
  return tarotist.plan.no <= currentPlan.no;
};

const renderStars = (quality: number | null | undefined) =>
  "⭐️".repeat(quality ?? 0);

export function TarotistCarouselPortrait({
  tarotists,
  selectedTarotist,
  onSelect,
  currentPlan,
  onUpgrade,
}: TarotistCarouselPortraitProps) {
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

  if (tarotists.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        占い師が見つかりませんでした
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
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

                      {/* プランバッジ */}
                      {tarotist.plan && (
                        <div
                          className="absolute top-3 right-3 px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-lg"
                          style={{ backgroundColor: accent }}
                        >
                          {tarotist.plan.name}
                        </div>
                      )}

                      {/* アクティブインジケーター */}
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
                      {/* 名前・タイトル */}
                      <div className="text-center mb-2">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <span className="text-2xl drop-shadow">{tarotist.icon}</span>
                          <h3
                            className="text-xl font-bold drop-shadow"
                            style={{
                              color: accent,
                              textShadow: "1px 1px 4px rgba(0,0,0,0.8)",
                            }}
                          >
                            {tarotist.name}
                          </h3>
                        </div>
                        <p
                          className="text-xs font-semibold"
                          style={{
                            color: accent,
                            textShadow: "1px 1px 3px rgba(0,0,0,0.7)",
                          }}
                        >
                          {tarotist.title}
                        </p>
                      </div>

                      {/* 特徴 */}
                      <p
                        className="text-center text-xs mb-2 line-clamp-2"
                        style={{
                          color: accent,
                          textShadow: "1px 1px 3px rgba(0,0,0,0.7)",
                        }}
                      >
                        {tarotist.trait}
                      </p>

                      {/* おすすめ度 */}
                      {tarotist.quality != null && (
                        <div className="text-center text-sm mb-3">
                          {renderStars(tarotist.quality)}
                        </div>
                      )}

                      {/* アクションボタン */}
                      {available ? (
                        <motion.button
                          type="button"
                          onClick={() => onSelect(tarotist)}
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
                          onClick={() => onUpgrade(tarotist.plan?.code ?? "")}
                          className="w-full py-2.5 rounded-xl text-white font-bold text-sm shadow-lg"
                          style={{ backgroundColor: accent }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {tarotist.plan?.name ?? "PREMIUM"}にアップグレード
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
              i === selectedIndex
                ? "w-6 h-2.5 bg-purple-500"
                : "w-2.5 h-2.5 bg-gray-300"
            }`}
            aria-label={`占い師 ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
