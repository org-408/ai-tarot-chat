"use client";
import type { Spread, SpreadToCategory } from "@/../shared/lib/types";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMasterStore } from "@/lib/store/master-store";

export function SpreadToolbar({
  spread,
  onChange,
}: {
  spread: Spread;
  onChange: (m: Spread) => void;
}) {
  const { plans, levels, categories, isLoading } = useMasterStore((state) => ({
    plans: state.plans,
    levels: state.levels,
    categories: state.categories,
    isLoading: state.isLoading,
  }));

  if (isLoading) {
    return (
      <div className="py-2 text-sm text-muted-foreground">
        マスターデータ読み込み中...
      </div>
    );
  }

  const selectedCategoryIds = spread.categories?.map((c) => c.categoryId) || [];

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <div className="grid gap-1">
        <label className="text-sm font-medium">📝 スプレッド名</label>
        <Input
          value={spread.name}
          onChange={(e) => onChange({ ...spread, name: e.target.value })}
          placeholder="スプレッド名"
        />
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium">📂 カテゴリ</label>
        <MultiSelect
          options={categories.map((c) => ({ label: c.name, value: c.id }))}
          selected={selectedCategoryIds}
          onChange={(newCategoryIds) => {
            const categoriIds = newCategoryIds.map(
              (id) => ({ categoryId: id } as SpreadToCategory)
            );

            onChange({
              ...spread,
              categories: categoriIds,
            });
          }}
          placeholder="カテゴリを選択"
        />
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium">⭐ 難易度</label>
        <Select
          value={spread.level?.name || ""}
          onValueChange={(v) => onChange({ ...spread, levelId: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {levels.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium">💎 必要プラン</label>
        <Select
          value={spread.plan?.name}
          onValueChange={(v) => onChange({ ...spread, planId: v })}
        >
          <SelectTrigger>
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
      </div>
      {/* <div className="lg:col-span-4 flex gap-2 justify-end">
        <Button
          variant="secondary"
          className="bg-sky-100 text-sky-800 hover:bg-sky-200"
        >
          📋 複製
        </Button>
        <Button
          variant="outline"
          className="border-sky-300 text-sky-700 hover:bg-sky-50"
        >
          👁️ プレビュー
        </Button>
        <Button className="bg-sky-600 hover:bg-sky-700">💾 保存</Button>
      </div> */}
    </div>
  );
}
