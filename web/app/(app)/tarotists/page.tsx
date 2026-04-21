"use client";

import type { Tarotist } from "@shared/lib/types";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useMasterStore } from "@/lib/client/stores/master-store";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function TarotistModal({
  tarotist,
  onClose,
}: {
  tarotist: Tarotist;
  onClose: () => void;
}) {
  const t = useTranslations("tarotist");
  const router = useRouter();
  const primaryColor = tarotist.primaryColor ?? "#7c3aed";
  const accentColor = tarotist.accentColor ?? "#8b5cf6";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="w-full max-w-sm bg-white rounded-3xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div
          className="relative h-48 flex items-end p-6"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
          }}
        >
          <img
            src={`/tarotists/${tarotist.name}.png`}
            alt={tarotist.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center 15%" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="relative z-10 text-white">
            <p className="text-3xl mb-1">{tarotist.icon}</p>
            <h2 className="text-2xl font-bold">{tarotist.name}</h2>
            <p className="text-white/80 text-sm">{tarotist.title}</p>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          {tarotist.quality != null && (
            <p className="text-sm text-gray-500 mb-3">
              {t("quality")}: {"⭐".repeat(tarotist.quality)}
            </p>
          )}
          {tarotist.bio && (
            <p
              className="text-sm text-gray-700 leading-relaxed mb-6"
              dangerouslySetInnerHTML={{ __html: tarotist.bio }}
            />
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
            >
              閉じる
            </button>
            <button
              onClick={() => {
                onClose();
                router.push("/");
              }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
              }}
            >
              {t("selectForReading")}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function TarotistsPage() {
  const t = useTranslations("tarotist");
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
        <div className="text-4xl animate-pulse">🔮</div>
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
                onClick={() => canUse && setSelected(tarotist)}
                className={`relative rounded-2xl overflow-hidden text-left ${!canUse ? "opacity-60" : ""}`}
              >
                {/* カード */}
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
                  <div className="absolute inset-0 flex items-center justify-center text-4xl pointer-events-none">
                    {tarotist.icon}
                  </div>
                  {!canUse && (
                    <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold bg-gray-800/70 px-2 py-1 rounded-full">
                        🔒 {t("locked")}
                      </span>
                    </div>
                  )}
                </div>
                {/* 情報 */}
                <div className="p-2 bg-white border-x border-b border-gray-100 rounded-b-2xl">
                  <p className="font-bold text-sm truncate">
                    {tarotist.icon} {tarotist.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {tarotist.title}
                  </p>
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
          <TarotistModal
            tarotist={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
