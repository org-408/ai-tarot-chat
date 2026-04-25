"use client";

import { useState } from "react";
import Image from "next/image";
import type { RankingItem, RankingResponse } from "@/lib/server/services/ranking";

type TabKey = "tarotists" | "spreads" | "categories" | "cards" | "personalCategories";

const TABS: { key: TabKey; label: string; short: string }[] = [
  { key: "tarotists", label: "AI占い師", short: "占い師" },
  { key: "spreads", label: "スプレッド", short: "スプレッド" },
  { key: "categories", label: "ジャンル", short: "ジャンル" },
  { key: "cards", label: "引かれたカード", short: "カード" },
  { key: "personalCategories", label: "対話リーディングのテーマ", short: "対話" },
];

export function RankingTabs({ data }: { data: RankingResponse }) {
  const [active, setActive] = useState<TabKey>("tarotists");
  const items = data[active];

  return (
    <div>
      {/* タブ */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              active === t.key
                ? "bg-purple-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 一覧 */}
      {items.length === 0 ? (
        <p className="text-sm text-slate-500 py-12 text-center">
          まだランキングデータがありません。
        </p>
      ) : (
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <RankingRow key={`${active}-${item.id}`} item={item} kind={active} />
          ))}
        </ol>
      )}
    </div>
  );
}

function RankingRow({ item, kind }: { item: RankingItem; kind: TabKey }) {
  const rankColor =
    item.rank === 1
      ? "text-yellow-600 bg-yellow-100"
      : item.rank === 2
      ? "text-slate-600 bg-slate-200"
      : item.rank === 3
      ? "text-orange-700 bg-orange-100"
      : "text-slate-500 bg-slate-100";

  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 hover:border-purple-200 hover:bg-purple-50/20 transition-all">
      <span
        className={`flex-shrink-0 w-9 h-9 rounded-full font-bold text-sm grid place-items-center ${rankColor}`}
      >
        {item.rank}
      </span>

      {/* ビジュアル（種別に応じて） */}
      {kind === "cards" && item.cardCode && (
        <div className="flex-shrink-0 w-10 h-16 relative">
          <Image
            src={`/cards/${cardCodeToFile(item.cardCode)}`}
            alt={item.name}
            fill
            className="object-cover rounded-sm shadow-sm"
            sizes="40px"
          />
        </div>
      )}
      {kind === "tarotists" && (
        <div className="flex-shrink-0 w-10 h-10 grid place-items-center rounded-full bg-purple-100 text-xl">
          {item.icon ?? "✨"}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
        {kind === "spreads" && item.cardCount !== undefined && (
          <p className="text-xs text-slate-500 mt-0.5">{item.cardCount}枚</p>
        )}
        {item.count > 0 && (
          <p className="text-xs text-purple-600 mt-0.5">利用 {item.count.toLocaleString()} 回</p>
        )}
      </div>
    </li>
  );
}

// TarotCard.code は "0_Fool" のような形式。画像ファイルは "0_fool.png"（小文字）
function cardCodeToFile(code: string): string {
  return `${code.toLowerCase()}.png`;
}
