"use client";

import type { Plan, Tarotist } from "@/../shared/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { MdAdd, MdEdit, MdRefresh, MdDelete } from "react-icons/md";

const PROVIDER_OPTIONS = [
  "GPT5NANO",
  "GEMINI25",
  "GEMINI25PRO",
  "GPT41",
  "GPT5",
  "CLAUDE_H",
  "CLAUDE_S",
  "OFFLINE",
] as const;

type FormState = Partial<Tarotist>;

const EMPTY_FORM: FormState = {
  no: 1,
  name: "",
  title: "",
  icon: "🔮",
  trait: "",
  bio: "",
  primaryColor: "#4F46E5",
  secondaryColor: "#7C3AED",
  accentColor: "#EC4899",
  provider: "CLAUDE_S",
  model: "",
  cost: "",
  quality: 3,
  planId: "",
};

export default function TarotistsPage() {
  const [tarotists, setTarotists] = useState<Tarotist[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/tarotists").then((r) => r.json()),
      fetch("/api/plans").then((r) => r.json()),
    ]).then(([t, p]) => {
      setTarotists(t);
      setPlans(p);
      setLoading(false);
    });
  }, []);

  const displayed = showDeleted
    ? tarotists
    : tarotists.filter((t) => !t.deletedAt);

  function openCreate() {
    setEditing({
      ...EMPTY_FORM,
      no: tarotists.length + 1,
      planId: plans[0]?.id ?? "",
    });
    setDialogOpen(true);
  }

  function openEdit(t: Tarotist) {
    setEditing({ ...t });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const isNew = !editing.id;
      const url = isNew ? "/api/admin/tarotists" : `/api/admin/tarotists/${editing.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved: Tarotist = await res.json();
      setTarotists((prev) =>
        isNew ? [...prev, saved] : prev.map((t) => (t.id === saved.id ? saved : t))
      );
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: Tarotist) {
    if (!confirm(`「${t.name}」を削除しますか？（ソフトデリート）`)) return;
    const res = await fetch(`/api/admin/tarotists/${t.id}`, { method: "DELETE" });
    if (!res.ok) return;
    const updated: Tarotist = await res.json();
    setTarotists((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  }

  async function handleRestore(t: Tarotist) {
    const res = await fetch(`/api/admin/tarotists/${t.id}`, { method: "PATCH" });
    if (!res.ok) return;
    const updated: Tarotist = await res.json();
    setTarotists((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  }

  function updateField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setEditing((prev) => prev ? { ...prev, [key]: val } : prev);
  }

  return (
    <div className="space-y-4 p-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>🔮 タロティスト管理</CardTitle>
          <div className="flex gap-2 items-center">
            <label className="flex items-center gap-1 text-sm text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
              />
              削除済みも表示
            </label>
            <Button onClick={openCreate}>
              <MdAdd className="mr-1" />
              新規作成
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-400 py-4">読み込み中...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-500 text-left">
                    <th className="py-2 px-2 w-8">No</th>
                    <th className="py-2 px-2">名前</th>
                    <th className="py-2 px-2">肩書き</th>
                    <th className="py-2 px-2">モデル</th>
                    <th className="py-2 px-2">プラン</th>
                    <th className="py-2 px-2 w-12 text-center">品質</th>
                    <th className="py-2 px-2 w-16 text-center">状態</th>
                    <th className="py-2 px-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((t) => (
                    <tr
                      key={t.id}
                      className={`border-b hover:bg-slate-50 ${t.deletedAt ? "opacity-40" : ""}`}
                    >
                      <td className="py-2 px-2 text-slate-400">{t.no}</td>
                      <td className="py-2 px-2 font-medium">
                        <span className="mr-1">{t.icon}</span>
                        {t.name}
                      </td>
                      <td className="py-2 px-2 text-slate-500">{t.title}</td>
                      <td className="py-2 px-2 font-mono text-xs text-slate-500">
                        {t.model ?? t.provider ?? "-"}
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-xs">
                          {(t.plan as Plan)?.code ?? t.planId}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {"⭐".repeat(t.quality ?? 0)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {t.deletedAt ? (
                          <Badge variant="destructive" className="text-xs">削除済</Badge>
                        ) : (
                          <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">有効</Badge>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(t)}
                          >
                            <MdEdit />
                          </Button>
                          {t.deletedAt ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRestore(t)}
                              title="復元"
                            >
                              <MdRefresh />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDelete(t)}
                            >
                              <MdDelete />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "タロティスト編集" : "タロティスト新規作成"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <label className="font-medium">表示順 (No)</label>
                <Input
                  type="number"
                  value={editing.no ?? ""}
                  onChange={(e) => updateField("no", Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium">アイコン</label>
                <Input
                  value={editing.icon ?? ""}
                  onChange={(e) => updateField("icon", e.target.value)}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="font-medium">名前 *</label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="font-medium">肩書き</label>
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) => updateField("title", e.target.value)}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="font-medium">特徴・性格 (trait)</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm resize-none h-20"
                  value={editing.trait ?? ""}
                  onChange={(e) => updateField("trait", e.target.value)}
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="font-medium">プロフィール (bio)</label>
                <textarea
                  className="w-full border rounded-md p-2 text-sm resize-none h-20"
                  value={editing.bio ?? ""}
                  onChange={(e) => updateField("bio", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium">プロバイダー</label>
                <Select
                  value={editing.provider ?? ""}
                  onValueChange={(v) => updateField("provider", v as Tarotist["provider"])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="font-medium">モデルキー</label>
                <Input
                  value={editing.model ?? ""}
                  onChange={(e) => updateField("model", e.target.value)}
                  placeholder="例: claude_s, gpt41"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium">プラン</label>
                <Select
                  value={editing.planId ?? ""}
                  onValueChange={(v) => updateField("planId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="font-medium">品質スコア (1-5)</label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={editing.quality ?? ""}
                  onChange={(e) => updateField("quality", Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium">テーマ色 (primaryColor)</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={editing.primaryColor ?? "#000000"}
                    onChange={(e) => updateField("primaryColor", e.target.value)}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={editing.primaryColor ?? ""}
                    onChange={(e) => updateField("primaryColor", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium">サブ色 (secondaryColor)</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={editing.secondaryColor ?? "#000000"}
                    onChange={(e) => updateField("secondaryColor", e.target.value)}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={editing.secondaryColor ?? ""}
                    onChange={(e) => updateField("secondaryColor", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-medium">アクセント色 (accentColor)</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={editing.accentColor ?? "#000000"}
                    onChange={(e) => updateField("accentColor", e.target.value)}
                    className="w-12 h-9 p-1"
                  />
                  <Input
                    value={editing.accentColor ?? ""}
                    onChange={(e) => updateField("accentColor", e.target.value)}
                  />
                </div>
              </div>

              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
