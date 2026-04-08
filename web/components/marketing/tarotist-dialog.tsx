"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Tarotist } from "@/../shared/lib/types";
import Image from "next/image";
import Link from "next/link";

type TarotistWithPlan = Tarotist & { plan?: { name: string; accentColor: string; code: string } };

function renderStars(quality: number): string {
  const full = Math.round(quality);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}

interface TarotistDialogProps {
  tarotist: TarotistWithPlan | null;
  onClose: () => void;
}

export function TarotistDialog({ tarotist, onClose }: TarotistDialogProps) {
  if (!tarotist) return null;

  const planName = tarotist.plan?.name ?? "";
  const accentColor = tarotist.accentColor ?? tarotist.plan?.accentColor ?? "#7c3aed";
  const isOffline = tarotist.provider === "OFFLINE";

  return (
    <Dialog open={!!tarotist} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="p-0 overflow-hidden max-w-sm sm:max-w-md rounded-2xl border-0 shadow-2xl"
        showCloseButton={false}
      >
        {/* スクリーンリーダー用タイトル */}
        <DialogTitle className="sr-only">{tarotist.name} — {tarotist.title}</DialogTitle>

        {/* 画像エリア（上半分） */}
        <div className="relative w-full aspect-[3/2] overflow-hidden">
          <Image
            src={`/tarotists/${tarotist.name}.png`}
            alt={`${tarotist.name} — ${tarotist.title}`}
            fill
            className="object-cover object-top"
            sizes="(max-width: 640px) 100vw, 448px"
            priority
          />
          {/* グラデーションオーバーレイ */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, transparent 40%, ${tarotist.primaryColor}ee 100%)`,
            }}
          />
          {/* 閉じるボタン */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors text-lg leading-none"
            aria-label="閉じる"
          >
            ×
          </button>
          {/* プランバッジ */}
          <div
            className="absolute top-3 left-3 text-white text-xs font-semibold px-3 py-1 rounded-full"
            style={{ backgroundColor: accentColor }}
          >
            {isOffline ? "オフライン" : `${planName}プラン`}
          </div>
          {/* 名前（画像下部に重ねる） */}
          <div className="absolute bottom-4 left-0 right-0 text-center px-4">
            <h2
              className="text-3xl font-bold drop-shadow-lg"
              style={{
                fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
                color: accentColor,
                textShadow: "0 1px 4px rgba(0,0,0,0.5)",
              }}
            >
              {tarotist.icon} {tarotist.name}
            </h2>
            <p className="text-sm text-white/90 drop-shadow mt-0.5">{tarotist.title}</p>
          </div>
        </div>

        {/* 詳細エリア（下半分） */}
        <div
          className="px-6 pb-6 pt-4"
          style={{ backgroundColor: `${tarotist.primaryColor}30` }}
        >
          {/* 特徴タグ */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tarotist.trait.split("・").map((t) => (
              <span
                key={t}
                className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: accentColor }}
              >
                {t}
              </span>
            ))}
          </div>

          {/* bio */}
          <p
            className="text-sm text-slate-700 leading-relaxed mb-4"
            dangerouslySetInnerHTML={{ __html: tarotist.bio ?? "" }}
          />

          {/* おすすめ度 */}
          {!isOffline && tarotist.quality != null && (
            <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-200">
              <span className="text-xs text-slate-500">おすすめ度</span>
              <span className="text-base tracking-wider" style={{ color: accentColor }}>
                {renderStars(tarotist.quality)}
              </span>
              <span className="text-xs text-slate-400">({tarotist.quality}/5)</span>
            </div>
          )}

          {/* CTA */}
          <Link
            href="/download"
            className="block w-full text-center rounded-xl py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: accentColor }}
            onClick={onClose}
          >
            {isOffline
              ? "アプリをダウンロードして試す"
              : `${planName}プランで${tarotist.name}と占う →`}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
