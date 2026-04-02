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
import { useCallback, useEffect, useState } from "react";
import { MdChevronLeft, MdChevronRight, MdSearch } from "react-icons/md";

type PlanSummary = { id: string; name: string; code: string };

type ClientRow = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  isRegistered: boolean;
  provider: string | null;
  dailyReadingsCount: number;
  plan: PlanSummary;
  devices: { id: string; platform: string | null; lastSeenAt: string }[];
};

type Response = {
  clients: ClientRow[];
  total: number;
  page: number;
  limit: number;
};

const PLAN_CODES = ["ALL", "GUEST", "FREE", "STANDARD", "PREMIUM"];
const PLAN_COLOR: Record<string, string> = {
  GUEST: "bg-gray-100 text-gray-600",
  FREE: "bg-green-100 text-green-700",
  STANDARD: "bg-blue-100 text-blue-700",
  PREMIUM: "bg-purple-100 text-purple-700",
};

export default function ClientsPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PlanSummary[]>([]);

  const [page, setPage] = useState(1);
  const [planFilter, setPlanFilter] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [inputValue, setInputValue] = useState("");

  const LIMIT = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      plan: planFilter,
      ...(keyword ? { q: keyword } : {}),
    });
    const res = await fetch(`/api/admin/clients?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [page, planFilter, keyword]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetch("/api/plans").then((r) => r.json()).then(setPlans);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setKeyword(inputValue);
    setPage(1);
  }

  function handlePlanChange(v: string) {
    setPlanFilter(v);
    setPage(1);
  }

  async function handlePlanUpdate(clientId: string, planId: string) {
    await fetch(`/api/admin/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    fetchData();
  }

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 1;

  return (
    <div className="space-y-4 p-2">
      <Card>
        <CardHeader>
          <CardTitle>👥 クライアント管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* フィルター */}
          <div className="flex gap-2 flex-wrap">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="名前・メールで検索..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-60"
              />
              <Button type="submit" variant="outline" size="sm">
                <MdSearch className="mr-1" />
                検索
              </Button>
            </form>
            <Select value={planFilter} onValueChange={handlePlanChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_CODES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "ALL" ? "全プラン" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {data && (
              <span className="text-sm text-slate-500 self-center">
                {data.total.toLocaleString()} 件
              </span>
            )}
          </div>

          {/* テーブル */}
          {loading ? (
            <p className="text-sm text-slate-400 py-4">読み込み中...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-500 text-left">
                    <th className="py-2 px-2">名前 / メール</th>
                    <th className="py-2 px-2">プラン</th>
                    <th className="py-2 px-2 w-24">種別</th>
                    <th className="py-2 px-2 w-24">登録日</th>
                    <th className="py-2 px-2 w-24">最終ログイン</th>
                    <th className="py-2 px-2 w-16 text-center">今日</th>
                    <th className="py-2 px-2 w-36">プラン変更</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.clients.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 px-2">
                        <div className="font-medium">{c.name ?? "(名前なし)"}</div>
                        <div className="text-xs text-slate-400">{c.email ?? "-"}</div>
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            PLAN_COLOR[c.plan.code] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {c.plan.name}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        {c.isRegistered ? (
                          <Badge className="text-xs bg-sky-100 text-sky-700 hover:bg-sky-100">
                            {c.provider ?? "登録済"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-slate-400">
                            ゲスト
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-2 text-xs text-slate-500">
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString("ja-JP")
                          : "-"}
                      </td>
                      <td className="py-2 px-2 text-xs text-slate-500">
                        {c.lastLoginAt
                          ? new Date(c.lastLoginAt).toLocaleDateString("ja-JP")
                          : "-"}
                      </td>
                      <td className="py-2 px-2 text-center text-sm font-semibold">
                        {c.dailyReadingsCount}
                      </td>
                      <td className="py-2 px-2">
                        <Select
                          value={c.plan.id}
                          onValueChange={(v) => handlePlanUpdate(c.id, v)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {plans.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2 justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <MdChevronLeft />
              </Button>
              <span className="text-sm text-slate-500">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
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
