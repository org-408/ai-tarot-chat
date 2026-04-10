"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MdChevronLeft, MdChevronRight, MdSearch } from "react-icons/md";
import { ReadingDetailModal } from "@/components/admin/reading-detail-modal";

type PlanSummary = { id: string; name: string; code: string };

type CardRow = {
  id: string;
  order: number;
  position: string;
  isReversed: boolean;
  keywords: string[];
  cardName: string;
  cardCode: string;
};

type ChatMessageRow = {
  id: string;
  role: string;
  chatType: string;
  message: string;
  createdAt: string;
};

export type ReadingRow = {
  id: string;
  createdAt: string;
  customQuestion: string | null;
  client: {
    id: string;
    name: string | null;
    email: string | null;
    isRegistered: boolean;
    plan: PlanSummary;
  };
  tarotist: { id: string; name: string; icon: string; model: string | null };
  spread: { id: string; name: string; cellCount: number };
  category: { id: string; name: string } | null;
  cards: CardRow[];
};

type Filters = {
  tarotists: { id: string; name: string; icon: string }[];
  spreads: { id: string; name: string }[];
  categories: { id: string; name: string }[];
};

type CurrentFilters = {
  keyword: string;
  tarotistId: string;
  spreadId: string;
  categoryId: string;
  date: string;
};

const PLAN_COLOR: Record<string, string> = {
  GUEST: "bg-gray-100 text-gray-600",
  FREE: "bg-green-100 text-green-700",
  STANDARD: "bg-blue-100 text-blue-700",
  PREMIUM: "bg-purple-100 text-purple-700",
};

const DATE_OPTIONS = [
  { value: "", label: "全期間" },
  { value: "today", label: "今日" },
  { value: "week", label: "今週" },
  { value: "month", label: "今月" },
];

export function ReadingsPageClient({
  data,
  filters,
  currentFilters,
}: {
  data: { readings: ReadingRow[]; total: number; page: number; limit: number };
  filters: Filters;
  currentFilters: CurrentFilters;
}) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(currentFilters.keyword);
  const [selectedReading, setSelectedReading] = useState<ReadingRow | null>(null);

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  function navigate(next: Partial<CurrentFilters & { page: number }>) {
    const params = new URLSearchParams();
    const nextPage = next.page ?? (next.keyword !== undefined || next.tarotistId !== undefined || next.spreadId !== undefined || next.categoryId !== undefined || next.date !== undefined ? 1 : data.page);
    const nextKeyword = next.keyword ?? currentFilters.keyword;
    const nextTarotistId = next.tarotistId ?? currentFilters.tarotistId;
    const nextSpreadId = next.spreadId ?? currentFilters.spreadId;
    const nextCategoryId = next.categoryId ?? currentFilters.categoryId;
    const nextDate = next.date ?? currentFilters.date;

    if (nextPage > 1) params.set("page", String(nextPage));
    if (nextKeyword) params.set("q", nextKeyword);
    if (nextTarotistId) params.set("tarotistId", nextTarotistId);
    if (nextSpreadId) params.set("spreadId", nextSpreadId);
    if (nextCategoryId) params.set("categoryId", nextCategoryId);
    if (nextDate) params.set("date", nextDate);

    const query = params.toString();
    router.push(query ? `/admin/readings?${query}` : "/admin/readings");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ keyword: inputValue.trim() });
  }

  return (
    <div className="space-y-4 p-2">
      <Card>
        <CardHeader>
          <CardTitle>📖 占い履歴</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* フィルター行 */}
          <div className="flex gap-2 flex-wrap items-center">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="名前・メールで検索..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-52"
              />
              <Button type="submit" variant="outline" size="sm">
                <MdSearch className="mr-1" />
                検索
              </Button>
            </form>

            <Select
              value={currentFilters.date || "_all"}
              onValueChange={(v) => navigate({ date: v === "_all" ? "" : v })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || "_all"} value={opt.value || "_all"}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentFilters.tarotistId || "_all"}
              onValueChange={(v) => navigate({ tarotistId: v === "_all" ? "" : v })}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="タロティスト" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">全タロティスト</SelectItem>
                {filters.tarotists.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.icon} {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentFilters.spreadId || "_all"}
              onValueChange={(v) => navigate({ spreadId: v === "_all" ? "" : v })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="スプレッド" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">全スプレッド</SelectItem>
                {filters.spreads.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentFilters.categoryId || "_all"}
              onValueChange={(v) => navigate({ categoryId: v === "_all" ? "" : v })}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="カテゴリ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">全カテゴリ</SelectItem>
                {filters.categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm text-slate-500">
              {data.total.toLocaleString()} 件
            </span>
          </div>

          {/* テーブル */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-slate-500 text-left">
                  <th className="py-2 px-2 w-32">日時</th>
                  <th className="py-2 px-2">クライアント</th>
                  <th className="py-2 px-2">タロティスト</th>
                  <th className="py-2 px-2">スプレッド</th>
                  <th className="py-2 px-2 w-20">カテゴリ</th>
                  <th className="py-2 px-2 w-48">質問内容</th>
                  <th className="py-2 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.readings.map((reading) => (
                  <tr key={reading.id} className="border-b hover:bg-slate-50">
                    <td className="py-2 px-2 text-xs text-slate-500 align-top">
                      {new Date(reading.createdAt).toLocaleString("ja-JP", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 px-2 align-top">
                      <div className="font-medium">{reading.client.name ?? "(名前なし)"}</div>
                      <div className="text-xs text-slate-400">{reading.client.email ?? "-"}</div>
                      <div className="mt-0.5">
                        {reading.client.isRegistered ? (
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${PLAN_COLOR[reading.client.plan.code] ?? "bg-slate-100 text-slate-600"}`}>
                            {reading.client.plan.name}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-xs text-slate-400 h-5">
                            ゲスト
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 align-top">
                      <div>{reading.tarotist.icon} {reading.tarotist.name}</div>
                      <div className="text-xs text-slate-400">{reading.tarotist.model ?? "-"}</div>
                    </td>
                    <td className="py-2 px-2 align-top">
                      <div>{reading.spread.name}</div>
                      <div className="text-xs text-slate-400">{reading.spread.cellCount}枚</div>
                    </td>
                    <td className="py-2 px-2 align-top text-xs text-slate-600">
                      {reading.category?.name ?? "-"}
                    </td>
                    <td className="py-2 px-2 align-top text-xs">
                      {reading.customQuestion ? (
                        <p className="text-slate-700 break-all line-clamp-2" title={reading.customQuestion}>
                          {reading.customQuestion}
                        </p>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-2 px-2 align-top">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                        onClick={() => setSelectedReading(reading)}
                      >
                        ▶
                      </Button>
                    </td>
                  </tr>
                ))}
                {data.readings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      該当する占い履歴はありません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2 justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => navigate({ page: data.page - 1 })}
              >
                <MdChevronLeft />
              </Button>
              <span className="text-sm text-slate-500">
                {data.page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page >= totalPages}
                onClick={() => navigate({ page: data.page + 1 })}
              >
                <MdChevronRight />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 詳細モーダル */}
      {selectedReading && (
        <ReadingDetailModal
          reading={selectedReading}
          onClose={() => setSelectedReading(null)}
        />
      )}
    </div>
  );
}
