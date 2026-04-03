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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MdAdd, MdDelete, MdEdit, MdRefresh } from "react-icons/md";
import {
  createTarotistAction,
  deleteTarotistAction,
  restoreTarotistAction,
  updateTarotistAction,
} from "./actions";

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

export function TarotistsPageClient({
  tarotists,
  plans,
}: {
  tarotists: Tarotist[];
  plans: Plan[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const displayed = showDeleted
    ? tarotists
    : tarotists.filter((tarotist) => !tarotist.deletedAt);

  function openCreate() {
    setEditing({
      ...EMPTY_FORM,
      no: tarotists.length + 1,
      planId: plans[0]?.id ?? "",
    });
    setDialogOpen(true);
  }

  function openEdit(tarotist: Tarotist) {
    setEditing({ ...tarotist });
    setDialogOpen(true);
  }

  function updateField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setEditing((prev) => (prev ? { ...prev, [key]: val } : prev));
  }

  function sanitizePayload(input: FormState) {
    return {
      no: input.no,
      name: input.name,
      title: input.title,
      icon: input.icon,
      trait: input.trait,
      bio: input.bio,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      accentColor: input.accentColor,
      avatarUrl: input.avatarUrl,
      provider: input.provider,
      model: input.model,
      cost: input.cost,
      quality: input.quality,
      planId: input.planId,
      deletedAt: input.deletedAt,
    };
  }

  function handleSave() {
    if (!editing) return;
    setError("");

    startTransition(async () => {
      const payload = sanitizePayload(editing);
      const result = editing.id
        ? await updateTarotistAction(editing.id, payload)
        : await createTarotistAction(payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setDialogOpen(false);
      router.refresh();
    });
  }

  function handleDelete(tarotist: Tarotist) {
    if (!confirm(`「${tarotist.name}」を削除しますか？（ソフトデリート）`)) return;
    setError("");

    startTransition(async () => {
      const result = await deleteTarotistAction(tarotist.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleRestore(tarotist: Tarotist) {
    setError("");

    startTransition(async () => {
      const result = await restoreTarotistAction(tarotist.id);
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
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

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
                {displayed.map((tarotist) => (
                  <tr
                    key={tarotist.id}
                    className={`border-b hover:bg-slate-50 ${tarotist.deletedAt ? "opacity-40" : ""}`}
                  >
                    <td className="py-2 px-2 text-slate-400">{tarotist.no}</td>
                    <td className="py-2 px-2 font-medium">
                      <span className="mr-1">{tarotist.icon}</span>
                      {tarotist.name}
                    </td>
                    <td className="py-2 px-2 text-slate-500">{tarotist.title}</td>
                    <td className="py-2 px-2 font-mono text-xs text-slate-500">
                      {tarotist.model ?? tarotist.provider ?? "-"}
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant="outline" className="text-xs">
                        {tarotist.plan?.code ?? tarotist.planId}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-center">
                      {"⭐".repeat(tarotist.quality ?? 0)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {tarotist.deletedAt ? (
                        <Badge variant="destructive" className="text-xs">
                          削除済
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
                          有効
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(tarotist)}>
                          <MdEdit />
                        </Button>
                        {tarotist.deletedAt ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRestore(tarotist)}
                            title="復元"
                          >
                            <MdRefresh />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(tarotist)}
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
        </CardContent>
      </Card>

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
                  onValueChange={(value) =>
                    updateField("provider", value as Tarotist["provider"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_OPTIONS.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {provider}
                      </SelectItem>
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
                  onValueChange={(value) => updateField("planId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} ({plan.code})
                      </SelectItem>
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
                <Button onClick={handleSave} disabled={isPending}>
                  {isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
