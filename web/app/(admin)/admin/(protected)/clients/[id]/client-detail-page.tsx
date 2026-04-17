"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MdArrowBack, MdArrowDownward, MdArrowUpward, MdUnfoldMore } from "react-icons/md";
import { changeClientPlanAction, resetClientUsageAction } from "../actions";

type PlanSummary = { id: string; name: string; code: string };

type ClientDetail = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  isRegistered: boolean;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  deletedAt: string | null;
  dailyReadingsCount: number;
  dailyPersonalCount: number;
  lastReadingDate: string | null;
  plan: PlanSummary;
  user: { id: string; email: string | null; role: string } | null;
  devices: {
    id: string;
    deviceId: string;
    platform: string | null;
    appVersion: string | null;
    osVersion: string | null;
    lastSeenAt: string;
    createdAt: string;
  }[];
  planChangeHistories: {
    id: string;
    fromPlan: PlanSummary;
    toPlan: PlanSummary;
    reason: string | null;
    note: string | null;
    changedAt: string;
  }[];
  recentReadings: {
    id: string;
    createdAt: string;
    tarotist: { id: string; name: string; icon: string };
    spread: { id: string; name: string };
    category: { id: string; name: string } | null;
  }[];
  adminResetHistories: {
    id: string;
    resetType: string;
    adminEmail: string;
    reason: string | null;
    beforeReadingsCount: number;
    beforePersonalCount: number;
    afterReadingsCount: number;
    afterPersonalCount: number;
    createdAt: string;
  }[];
  dailyResetHistories: {
    id: string;
    date: string;
    resetType: string;
    beforeReadingsCount: number;
    afterReadingsCount: number;
    beforePersonalCount: number;
    afterPersonalCount: number;
    createdAt: string;
  }[];
  recentLogs: {
    id: string;
    level: string;
    message: string;
    path: string | null;
    source: string;
    timestamp: string;
    createdAt: string;
  }[];
};

const PLAN_COLOR: Record<string, string> = {
  GUEST: "bg-gray-100 text-gray-600",
  FREE: "bg-green-100 text-green-700",
  STANDARD: "bg-blue-100 text-blue-700",
  PREMIUM: "bg-purple-100 text-purple-700",
};

const LEVEL_COLOR: Record<string, string> = {
  error: "bg-red-100 text-red-700",
  warn: "bg-yellow-100 text-yellow-700",
  warning: "bg-yellow-100 text-yellow-700",
  info: "bg-blue-100 text-blue-700",
  debug: "bg-gray-100 text-gray-600",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ja-JP");
}

export function ClientDetailPage({
  client,
  plans,
}: {
  client: ClientDetail;
  plans: PlanSummary[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [resetError, setResetError] = useState("");
  const [isResetting, startResetTransition] = useTransition();
  const [logSortField, setLogSortField] = useState("timestamp");
  const [logSortDir, setLogSortDir] = useState<"asc" | "desc">("desc");

  function handleLogSort(field: string) {
    if (logSortField === field) {
      setLogSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setLogSortField(field);
      setLogSortDir("desc");
    }
  }

  const sortedLogs = [...client.recentLogs].sort((a, b) => {
    const av = a[logSortField as keyof typeof a] ?? "";
    const bv = b[logSortField as keyof typeof b] ?? "";
    const cmp = String(av).localeCompare(String(bv));
    return logSortDir === "asc" ? cmp : -cmp;
  });

  function handleResetUsage(resetType: "READINGS" | "PERSONAL" | "ALL") {
    setResetError("");
    startResetTransition(async () => {
      const result = await resetClientUsageAction({ clientId: client.id, resetType });
      if (!result.ok) {
        setResetError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handlePlanUpdate(nextPlanId: string) {
    setError("");
    startTransition(async () => {
      const result = await changeClientPlanAction({
        clientId: client.id,
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
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link href="/admin/clients">
          <Button variant="outline" size="sm">
            <MdArrowBack className="mr-1" /> 一覧へ戻る
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">
          👤 {client.name ?? "(名前なし)"}
          {client.deletedAt && (
            <span className="ml-2 text-sm text-red-500 font-normal">（削除済み）</span>
          )}
        </h1>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {resetError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {resetError}
        </div>
      )}

      {/* 基本情報 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="メール" value={client.email ?? "-"} />
            <Row label="登録種別">
              {client.isRegistered ? (
                <Badge className="text-xs bg-sky-100 text-sky-700 hover:bg-sky-100">
                  {client.provider ?? "登録済"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-slate-400">
                  ゲスト
                </Badge>
              )}
            </Row>
            <Row label="登録日" value={fmtDate(client.createdAt)} />
            <Row label="最終ログイン" value={client.lastLoginAt ? fmt(client.lastLoginAt) : "-"} />
            <Row label="最終占い日" value={client.lastReadingDate ? fmtDate(client.lastReadingDate) : "-"} />
            {client.user && (
              <Row label="ユーザーID" value={client.user.id} mono />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">プラン・利用状況</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="現在のプラン">
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  PLAN_COLOR[client.plan.code] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {client.plan.name}
              </span>
            </Row>
            <Row label="プラン変更">
              <Select
                value={client.plan.id}
                onValueChange={handlePlanUpdate}
                disabled={isPending}
              >
                <SelectTrigger className="h-7 text-xs w-40">
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
            </Row>
            <Row label="本日のクイック占い回数">
              <span>{client.dailyReadingsCount}</span>
              <Button
                size="sm"
                variant="outline"
                className="ml-2 h-6 text-xs"
                disabled={isResetting}
                onClick={() => handleResetUsage("READINGS")}
              >
                リセット
              </Button>
            </Row>
            <Row label="本日のパーソナル回数">
              <span>{client.dailyPersonalCount}</span>
              <Button
                size="sm"
                variant="outline"
                className="ml-2 h-6 text-xs"
                disabled={isResetting}
                onClick={() => handleResetUsage("PERSONAL")}
              >
                リセット
              </Button>
            </Row>
            <Row label="両方リセット">
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                disabled={isResetting}
                onClick={() => handleResetUsage("ALL")}
              >
                両方リセット
              </Button>
            </Row>
          </CardContent>
        </Card>
      </div>

      {/* デバイス */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">デバイス ({client.devices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {client.devices.length === 0 ? (
            <p className="text-sm text-slate-400">デバイスなし</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-500 text-left">
                    <th className="py-2 px-2">プラットフォーム</th>
                    <th className="py-2 px-2">OSバージョン</th>
                    <th className="py-2 px-2">アプリバージョン</th>
                    <th className="py-2 px-2">最終アクセス</th>
                    <th className="py-2 px-2">登録日</th>
                  </tr>
                </thead>
                <tbody>
                  {client.devices.map((device) => (
                    <tr key={device.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 px-2">{device.platform ?? "-"}</td>
                      <td className="py-2 px-2 text-xs text-slate-500">{device.osVersion ?? "-"}</td>
                      <td className="py-2 px-2 text-xs text-slate-500">{device.appVersion ?? "-"}</td>
                      <td className="py-2 px-2 text-xs text-slate-500">{fmt(device.lastSeenAt)}</td>
                      <td className="py-2 px-2 text-xs text-slate-500">{fmtDate(device.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* プラン変更履歴 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">プラン変更履歴 ({client.planChangeHistories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {client.planChangeHistories.length === 0 ? (
            <p className="text-sm text-slate-400">変更履歴なし</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-500 text-left">
                    <th className="py-2 px-2">変更日時</th>
                    <th className="py-2 px-2">変更前</th>
                    <th className="py-2 px-2">変更後</th>
                    <th className="py-2 px-2">理由</th>
                    <th className="py-2 px-2">メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {client.planChangeHistories.map((h) => (
                    <tr key={h.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 px-2 text-xs text-slate-500 whitespace-nowrap">{fmt(h.changedAt)}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${PLAN_COLOR[h.fromPlan.code] ?? "bg-slate-100 text-slate-600"}`}>
                          {h.fromPlan.name}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${PLAN_COLOR[h.toPlan.code] ?? "bg-slate-100 text-slate-600"}`}>
                          {h.toPlan.name}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs text-slate-500">{h.reason ?? "-"}</td>
                      <td className="py-2 px-2 text-xs text-slate-500">{h.note ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 管理者リセット履歴 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">管理者リセット履歴 ({client.adminResetHistories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {client.adminResetHistories.length === 0 ? (
            <p className="text-sm text-slate-400">リセット履歴なし</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-500 text-left">
                    <th className="py-2 px-2">日時</th>
                    <th className="py-2 px-2">種別</th>
                    <th className="py-2 px-2">クイック前→後</th>
                    <th className="py-2 px-2">パーソナル前→後</th>
                    <th className="py-2 px-2">管理者</th>
                    <th className="py-2 px-2">メモ</th>
                  </tr>
                </thead>
                <tbody>
                  {client.adminResetHistories.map((h) => (
                    <tr key={h.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 px-2 text-xs text-slate-500 whitespace-nowrap">{fmt(h.createdAt)}</td>
                      <td className="py-2 px-2">
                        <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          {h.resetType === "READINGS" ? "クイック" : h.resetType === "PERSONAL" ? "パーソナル" : "両方"}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs text-slate-500">{h.beforeReadingsCount} → {h.afterReadingsCount}</td>
                      <td className="py-2 px-2 text-xs text-slate-500">{h.beforePersonalCount} → {h.afterPersonalCount}</td>
                      <td className="py-2 px-2 text-xs text-slate-500">{h.adminEmail}</td>
                      <td className="py-2 px-2 text-xs text-slate-500">{h.reason ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 日次自動リセット履歴 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            日次自動リセット履歴（最新30件）
            <span className="ml-3 text-xs text-slate-400 font-normal">プラン変更・日付切替による自動リセット</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.dailyResetHistories.length === 0 ? (
            <p className="text-sm text-slate-400">リセット履歴なし</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-500 text-left">
                    <th className="py-2 px-2">日時</th>
                    <th className="py-2 px-2">対象日</th>
                    <th className="py-2 px-2">種別</th>
                    <th className="py-2 px-2">クイック前→後</th>
                    <th className="py-2 px-2">パーソナル前→後</th>
                  </tr>
                </thead>
                <tbody>
                  {client.dailyResetHistories.map((h) => (
                    <tr key={h.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 px-2 text-xs text-slate-500 whitespace-nowrap">{fmt(h.createdAt)}</td>
                      <td className="py-2 px-2 text-xs text-slate-500 whitespace-nowrap">{fmtDate(h.date)}</td>
                      <td className="py-2 px-2">
                        <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700">
                          {h.resetType}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs text-slate-500">{h.beforeReadingsCount} → {h.afterReadingsCount}</td>
                      <td className="py-2 px-2 text-xs text-slate-500">{h.beforePersonalCount} → {h.afterPersonalCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 直近の占い履歴 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            直近の占い履歴（最新20件）
            <Link
              href={`/admin/readings?cid=${encodeURIComponent(client.id)}`}
              className="ml-3 text-xs text-sky-600 hover:underline font-normal"
            >
              全件表示 →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.recentReadings.length === 0 ? (
            <p className="text-sm text-slate-400">占い履歴なし</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-500 text-left">
                    <th className="py-2 px-2">日時</th>
                    <th className="py-2 px-2">占い師</th>
                    <th className="py-2 px-2">スプレッド</th>
                    <th className="py-2 px-2">カテゴリ</th>
                  </tr>
                </thead>
                <tbody>
                  {client.recentReadings.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-slate-50">
                      <td className="py-2 px-2 text-xs text-slate-500 whitespace-nowrap">{fmt(r.createdAt)}</td>
                      <td className="py-2 px-2">
                        <span>{r.tarotist.icon} {r.tarotist.name}</span>
                      </td>
                      <td className="py-2 px-2 text-xs">{r.spread.name}</td>
                      <td className="py-2 px-2 text-xs text-slate-500">{r.category?.name ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 直近のログ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            直近のログ（最新20件）
            <Link
              href={`/admin/log-viewer?cid=${encodeURIComponent(client.id)}`}
              className="ml-3 text-xs text-sky-600 hover:underline font-normal"
            >
              全件表示 →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.recentLogs.length === 0 ? (
            <p className="text-sm text-slate-400">ログなし</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    {(["timestamp", "createdAt", "level", "source", "path", "message"] as const).map((f) => (
                      <th key={f} className="py-2 px-2">
                        <button
                          onClick={() => handleLogSort(f)}
                          className={`flex items-center gap-0.5 hover:text-slate-800 transition-colors whitespace-nowrap text-xs ${logSortField === f ? "text-slate-800 font-semibold" : "text-slate-500"}`}
                        >
                          {{ timestamp: "発生日時", createdAt: "DB記録日時", level: "レベル", source: "ソース", path: "パス", message: "メッセージ" }[f]}
                          {logSortField === f ? (
                            logSortDir === "asc" ? <MdArrowUpward size={12} /> : <MdArrowDownward size={12} />
                          ) : (
                            <MdUnfoldMore size={12} className="opacity-30" />
                          )}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedLogs.map((l) => (
                    <tr key={l.id} className="border-b hover:bg-slate-50 text-xs">
                      <td className="py-1.5 px-2 text-slate-500 whitespace-nowrap">{fmt(l.timestamp)}</td>
                      <td className="py-1.5 px-2 text-slate-400 whitespace-nowrap">{fmt(l.createdAt)}</td>
                      <td className="py-1.5 px-2">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${LEVEL_COLOR[l.level] ?? "bg-slate-100 text-slate-600"}`}>
                          {l.level}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-slate-500">{l.source}</td>
                      <td className="py-1.5 px-2 text-slate-500 break-all">{l.path ?? "-"}</td>
                      <td className="py-1.5 px-2 break-all max-w-xs">{l.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500 w-36 flex-none">{label}</span>
      {children ?? (
        <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
      )}
    </div>
  );
}
