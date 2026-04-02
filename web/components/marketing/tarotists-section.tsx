"use client";

import Image from "next/image";
import { useState } from "react";
import type { Tarotist } from "@/../shared/lib/types";
import { TarotistDialog } from "./tarotist-dialog";

type TarotistWithPlan = Tarotist & { plan?: { name: string; accentColor: string; code: string } };

function TarotistCard({
  t,
  onClick,
}: {
  t: TarotistWithPlan;
  onClick: () => void;
}) {
  const planName = t.plan?.name ?? "";

  return (
    <button
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden border border-white/60 bg-white shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 text-left w-full cursor-pointer"
      style={{ background: `linear-gradient(135deg, ${t.primaryColor}44, white)` }}
    >
      {/* プランバッジ */}
      <span className="absolute top-2 right-2 z-10 text-xs text-slate-500 bg-white/90 rounded-full px-2 py-0.5 border border-slate-100">
        {t.provider === "OFFLINE" ? "オフライン" : planName}
      </span>

      {/* 画像 */}
      <div className="relative w-full aspect-[3/4]">
        <Image
          src={`/tarotists/${t.name}.png`}
          alt={`${t.name} — ${t.title}`}
          fill
          className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-base">{t.icon}</span>
            <span className="font-bold text-sm leading-tight">{t.name}</span>
          </div>
          <p className="text-xs text-white/80">{t.title}</p>
        </div>
      </div>

      {/* 特徴 */}
      <div className="p-3">
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{t.trait}</p>
        <p className="text-xs text-purple-600 mt-1.5 font-medium group-hover:underline">
          詳しく見る →
        </p>
      </div>
    </button>
  );
}

export function TarotistsSection({ tarotists }: { tarotists: TarotistWithPlan[] }) {
  const [selected, setSelected] = useState<TarotistWithPlan | null>(null);

  if (tarotists.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {["🌸 Lily", "🌙 Luna", "⭐ Stella", "🔮 Celine", "✨ Gloria", "💎 Sophia", "👸 Ariadne", "📚 Clara"].map(
          (label) => (
            <div
              key={label}
              className="rounded-2xl bg-purple-50 border border-purple-100 p-6 flex items-center justify-center"
            >
              <span className="text-lg font-medium text-slate-700">{label}</span>
            </div>
          )
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {tarotists.map((t) => (
          <TarotistCard key={t.id} t={t} onClick={() => setSelected(t)} />
        ))}
      </div>

      <TarotistDialog tarotist={selected} onClose={() => setSelected(null)} />
    </>
  );
}
