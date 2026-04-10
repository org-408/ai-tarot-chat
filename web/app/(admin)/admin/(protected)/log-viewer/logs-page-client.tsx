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
import {
  MdArrowDownward,
  MdArrowUpward,
  MdChevronLeft,
  MdChevronRight,
  MdExpandLess,
  MdExpandMore,
  MdSearch,
  MdUnfoldMore,
} from "react-icons/md";

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
  date: string;
  keyword: string;
  sort: string;
  sortBy: string;
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
};

const DATE_OPTIONS = [
  { value: "all", label: "全期間" },
  { value: "hour", label: "直近1時間" },
  { value: "today", label: "今日" },
  { value: "week", label: "過去7日" },
];

const LEVEL_OPTIONS = ["ALL", "error", "warn", "info", "debug"];

function SortTh({
  label,
  field,
  currentSortBy,
  currentSort,
  onSort,
  className,
}: {
  label: string;
  field: string;
  currentSortBy: string;
  currentSort: string;
  onSort: (field: string) => void;
  className?: string;
}) {
  const active = currentSortBy === field;
  return (
    <th className={`py-2 px-2 ${className ?? ""}`}>
      <button
        onClick={() => onSort(field)}
        className={`flex items-center gap-0.5 hover:text-slate-800 transition-colors whitespace-nowrap ${active ? "text-slate-800 font-semibold" : "text-slate-500"}`}
      >
        {label}
        {active ? (
          currentSort === "asc" ? <MdArrowUpward size={13} /> : <MdArrowDownward size={13} />
        ) : (
          <MdUnfoldMore size={13} className="opacity-30" />
        )}
      </button>
    </th>
  );
}

function MetadataCell({ metadata }: { metadata: Record<string, unknown> | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!metadata) return <span className="text-slate-300">-</span>;

  const full = JSON.stringify(metadata, null, 2);
  const preview = full.slice(0, 60);

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
  currentFilters,
}: {
  data: Response;
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
      const nextDate = next.date !== undefined ? next.date : currentFilters.date;
      const nextKeyword = next.keyword !== undefined ? next.keyword : currentFilters.keyword;
      const nextSort = next.sort ?? currentFilters.sort;
      const nextSortBy = next.sortBy ?? currentFilters.sortBy;

      if (nextPage > 1) params.set("page", String(nextPage));
      if (nextLevel && nextLevel !== "ALL") params.set("level", nextLevel);
      if (nextDate && nextDate !== "all") params.set("date", nextDate);
      if (nextKeyword) params.set("q", nextKeyword);
      if (nextSort === "asc") params.set("sort", "asc");
      if (nextSortBy && nextSortBy !== "timestamp") params.set("sortBy", nextSortBy);

      const query = params.toString();
      router.push(query ? `/admin/log-viewer?${query}` : "/admin/log-viewer");
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ keyword: inputValue.trim() });
  }

  function handleSort(field: string) {
    const isSameField = currentFilters.sortBy === field;
    navigate({
      sortBy: field,
      sort: isSameField ? (currentFilters.sort === "asc" ? "desc" : "asc") : "desc",
      page: 1,
    });
  }

  const sortProps = { currentSortBy: currentFilters.sortBy, currentSort: currentFilters.sort, onSort: handleSort };

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
              onValueChange={(value: string) => navigate({ level: value })}
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
              value={currentFilters.date || "all"}
              onValueChange={(value: string) => navigate({ date: value })}
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
                <tr className="border-b text-left">
                  <SortTh label="発生日時" field="timestamp" className="w-36" {...sortProps} />
                  <SortTh label="DB記録日時" field="createdAt" className="w-36" {...sortProps} />
                  <SortTh label="レベル" field="level" className="w-16" {...sortProps} />
                  <SortTh label="ソース" field="source" className="w-24" {...sortProps} />
                  <SortTh label="パス" field="path" className="w-40" {...sortProps} />
                  <SortTh label="メッセージ" field="message" {...sortProps} />
                  <SortTh label="クライアント" field="clientId" className="w-24" {...sortProps} />
                  <th className="py-2 px-2 w-36 text-slate-500">メタデータ</th>
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
                    <td className="py-1.5 px-2 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("ja-JP", {
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
                    <td colSpan={8} className="py-8 text-center text-slate-400">
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
    </div>
  );
}
