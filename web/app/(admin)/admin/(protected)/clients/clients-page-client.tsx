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
import { useState, useTransition } from "react";
import { MdChevronLeft, MdChevronRight, MdSearch } from "react-icons/md";
import { changeClientPlanAction } from "./actions";

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

export function ClientsPageClient({
  data,
  plans,
  planFilter,
  keyword,
}: {
  data: Response;
  plans: PlanSummary[];
  planFilter: string;
  keyword: string;
}) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState(keyword);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  function navigate(next: { page?: number; plan?: string; q?: string }) {
    const params = new URLSearchParams();
    const nextPage = next.page ?? data.page;
    const nextPlan = next.plan ?? planFilter;
    const nextKeyword = next.q ?? keyword;

    if (nextPage > 1) params.set("page", String(nextPage));
    if (nextPlan && nextPlan !== "ALL") params.set("plan", nextPlan);
    if (nextKeyword) params.set("q", nextKeyword);

    const query = params.toString();
    router.push(query ? `/admin/clients?${query}` : "/admin/clients");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ page: 1, q: inputValue.trim() });
  }

  function handlePlanFilterChange(value: string) {
    navigate({ page: 1, plan: value });
  }

  function handlePlanUpdate(clientId: string, nextPlanId: string) {
    setError("");
    startTransition(async () => {
      const result = await changeClientPlanAction({
        clientId,
        planId: nextPlanId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 p-2">
      <Card>
        <CardHeader>
          <CardTitle>👥 クライアント管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
            <Select value={planFilter} onValueChange={handlePlanFilterChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_CODES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code === "ALL" ? "全プラン" : code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-slate-500 self-center">
              {data.total.toLocaleString()} 件
            </span>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

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
                {data.clients.map((client) => (
                  <tr key={client.id} className="border-b hover:bg-slate-50">
                    <td className="py-2 px-2">
                      <div className="font-medium">{client.name ?? "(名前なし)"}</div>
                      <div className="text-xs text-slate-400">{client.email ?? "-"}</div>
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          PLAN_COLOR[client.plan.code] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {client.plan.name}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {client.isRegistered ? (
                        <Badge className="text-xs bg-sky-100 text-sky-700 hover:bg-sky-100">
                          {client.provider ?? "登録済"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-slate-400">
                          ゲスト
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs text-slate-500">
                      {new Date(client.createdAt).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="py-2 px-2 text-xs text-slate-500">
                      {client.lastLoginAt
                        ? new Date(client.lastLoginAt).toLocaleDateString("ja-JP")
                        : "-"}
                    </td>
                    <td className="py-2 px-2 text-center text-sm font-semibold">
                      {client.dailyReadingsCount}
                    </td>
                    <td className="py-2 px-2">
                      <Select
                        value={client.plan.id}
                        onValueChange={(value) => handlePlanUpdate(client.id, value)}
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {data.clients.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      該当するクライアントはいません。
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
