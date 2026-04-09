"use client";

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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MdChevronLeft, MdChevronRight, MdSearch, MdExpandMore, MdExpandLess } from "react-icons/md";

type LogRow = {
  id: string;
  level: string;
  message: string;
  metadata: Record<string, unknown> | null;
  path: string | null;
  source: string;
  clientId: string | null;
  timestamp: string;
  createdAt: string;
};

type Response = {
  logs: LogRow[];
  total: number;
  page: number;
  limit: number;
};

type CurrentFilters = {
  level: string;
  source: string;
  date: string;
  keyword: string;
};

const LEVEL_COLOR: Record<string, string> = {
  error: "bg-red-100 text-red-700 border-red-200",
  warn: "bg-yellow-100 text-yellow-700 border-yellow-200",
  warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
  info: "bg-blue-100 text-blue-700 border-blue-200",
  debug: "bg-gray-100 text-gray-600 border-gray-200",
};

const LEVEL_ROW_COLOR: Record<string, string> = {
  error: "bg-red-50 hover:bg-red-100",
  warn: "bg-yellow-50 hover:bg-yellow-100",
  warning: "bg-yellow-50 hover:bg-yellow-100",
  info: "hover:bg-slate-50",
  debug: "hover:bg-slate-50",
};

const DATE_OPTIONS = [
  { value: "", label: "全期間" },
  { value: "hour", label: "直近1時間" },
  { value: "today", label: "今日" },
  { value: "week", label: "過去7日" },
];

const LEVEL_OPTIONS = ["ALL", "error", "warn", "info", "debug"];

function MetadataCell({ metadata }: { metadata: Record<string, unknown> | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!metadata) return <span className="text-slate-300">-</span>;

  const preview = JSON.stringify(metadata).slice(0, 60);
  const full = JSON.stringify(metadata, null, 2);

  return (
    <div className="max-w-xs">
      {expanded ? (
        <div>
          <pre className="text-xs bg-slate-100 rounded p-1 whitespace-pre-wrap break-all max-h-40 overflow-auto">
            {full}
          </pre>
          <button
            onClick={() => setExpanded(false)}
            className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5"
          >
            <MdExpandLess size={14} /> 閉じる
          </button>
        </div>
      ) : (
        <div>
          <span className="text-xs text-slate-500 break-all">
            {preview}
            {full.length > 60 ? "…" : ""}
          </span>
          {full.length > 60 && (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5"
            >
              <MdExpandMore size={14} /> 展開
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function LogsPageClient({
  data,
  sources,
  currentFilters,
}: {
  data: Response;
  sources: string[];
  currentFilters: CurrentFilters;
}) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(currentFilters.keyword);
  const [, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  function navigate(next: Partial<CurrentFilters & { page: number }>) {
    startTransition(() => {
      const params = new URLSearchParams();
      const nextPage = next.page ?? 1;
      const nextLevel = next.level ?? currentFilters.level;
      const nextSource = next.source ?? currentFilters.source;
      const nextDate = next.date !== undefined ? next.date : currentFilters.date;
      const nextKeyword = next.keyword !== undefined ? next.keyword : currentFilters.keyword;

      if (nextPage > 1) params.set("page", String(nextPage));
      if (nextLevel && nextLevel !== "ALL") params.set("level", nextLevel);
      if (nextSource && nextSource !== "ALL") params.set("source", nextSource);
      if (nextDate) params.set("date", nextDate);
      if (nextKeyword) params.set("q", nextKeyword);

      const query = params.toString();
      router.push(query ? `/admin/log-viewer?${query}` : "/admin/log-viewer");
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ keyword: inputValue.trim() });
  }

  return (
    <div className="space-y-4 p-2">
      <Card>
        <CardHeader>
          <CardTitle>📋 ログ管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap items-center">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="メッセージ・パスで検索..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-60"
              />
              <Button type="submit" variant="outline" size="sm">
                <MdSearch className="mr-1" />
                検索
              </Button>
            </form>

            <Select
              value={currentFilters.level}
              onValueChange={(value) => navigate({ level: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l === "ALL" ? "全レベル" : l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentFilters.source}
              onValueChange={(value) => navigate({ source: value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全ソース</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={currentFilters.date}
              onValueChange={(value) => navigate({ date: value })}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm text-slate-500">
              {data.total.toLocaleString()} 件
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-slate-500 text-left">
                  <th className="py-2 px-2 w-36">日時</th>
                  <th className="py-2 px-2 w-16">レベル</th>
                  <th className="py-2 px-2 w-24">ソース</th>
                  <th className="py-2 px-2 w-40">パス</th>
                  <th className="py-2 px-2">メッセージ</th>
                  <th className="py-2 px-2 w-32">クライアント</th>
                  <th className="py-2 px-2 w-36">メタデータ</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`border-b text-xs ${LEVEL_ROW_COLOR[log.level] ?? "hover:bg-slate-50"}`}
                  >
                    <td className="py-1.5 px-2 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("ja-JP", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-1.5 px-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded border text-xs font-medium ${
                          LEVEL_COLOR[log.level] ?? "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-slate-500">{log.source}</td>
                    <td className="py-1.5 px-2 text-slate-500 break-all max-w-[10rem]">
                      {log.path ?? "-"}
                    </td>
                    <td className="py-1.5 px-2 break-all max-w-xs">{log.message}</td>
                    <td className="py-1.5 px-2">
                      {log.clientId ? (
                        <Link
                          href={`/admin/clients/${log.clientId}`}
                          className="text-sky-600 hover:underline font-mono text-xs"
                        >
                          {log.clientId.slice(0, 8)}…
                        </Link>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2">
                      <MetadataCell metadata={log.metadata} />
                    </td>
                  </tr>
                ))}
                {data.logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      該当するログはありません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2 justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() =>
                  navigate({
                    page: data.page - 1,
                    level: currentFilters.level,
                    source: currentFilters.source,
                    date: currentFilters.date,
                    keyword: currentFilters.keyword,
                  })
                }
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
                onClick={() =>
                  navigate({
                    page: data.page + 1,
                    level: currentFilters.level,
                    source: currentFilters.source,
                    date: currentFilters.date,
                    keyword: currentFilters.keyword,
                  })
                }
              >
                <MdChevronRight />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
