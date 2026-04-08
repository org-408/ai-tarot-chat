"use client";

import type {
  Plan,
  ReadingCategory,
  Spread,
  SpreadCell,
  SpreadInput,
  SpreadLevel,
} from "@/../shared/lib/types";
import { SpreadGrid } from "@/components/spreads/spread-grid";
import { SpreadLegend } from "@/components/spreads/spread-legend";
import { SpreadSettings } from "@/components/spreads/spread-settings";
import { SpreadTable } from "@/components/spreads/spread-table";
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
import { useMemo, useState, useTransition } from "react";
import { MdAdd, MdContentCopy, MdDelete, MdSave } from "react-icons/md";
import {
  createSpreadAction,
  deleteSpreadAction,
  updateSpreadAction,
} from "./actions";

const GRID_SIZE = [10, 10];

export function SpreadsPageClient({
  initialSpreads,
  plans,
  levels,
  categories,
}: {
  initialSpreads: Spread[];
  plans: Plan[];
  levels: SpreadLevel[];
  categories: ReadingCategory[];
}) {
  const router = useRouter();
  const [spreads, setSpreads] = useState(initialSpreads);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localCells, setLocalCells] = useState<SpreadCell[]>([]);
  const [gridSelected, setGridSelected] = useState<{ x: number; y: number } | null>(
    null
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selected = useMemo(
    () => spreads.find((spread) => spread.id === selectedId) ?? null,
    [spreads, selectedId]
  );

  function findGridCells() {
    if (!gridSelected) return [];
    return localCells.filter(
      (cell) => cell.x === gridSelected.x && cell.y === gridSelected.y
    );
  }

  function handleSelectRow(id: string) {
    const nextId = id === selectedId ? null : id;
    setSelectedId(nextId);
    const spread = spreads.find((item) => item.id === id);
    setGridSelected(null);
    setLocalCells(nextId ? spread?.cells ?? [] : []);
  }

  function updateSelected(patch: Partial<Spread>) {
    if (!selected) return;
    setSpreads((prev) =>
      prev.map((spread) =>
        spread.id === selected.id ? { ...spread, ...patch } : spread
      )
    );
  }

  function toggleCategory(categoryId: string) {
    if (!selected) return;
    const nextCategoryIds = new Set(
      selected.categories?.map((item) => item.categoryId) ?? []
    );
    if (nextCategoryIds.has(categoryId)) {
      nextCategoryIds.delete(categoryId);
    } else {
      nextCategoryIds.add(categoryId);
    }

    updateSelected({
      categories: categories
        .filter((category) => nextCategoryIds.has(category.id))
        .map((category) => ({
          spreadId: selected.id,
          categoryId: category.id,
          category,
        })),
    });
  }

  function upsertCell(next: SpreadCell[]) {
    if (!gridSelected || next.length === 0) return;
    const { x, y } = gridSelected;
    setLocalCells((prev) => {
      const filtered = prev.filter((cell) => !(cell.x === x && cell.y === y));
      return [...filtered, ...next];
    });
  }

  function removeCell(x: number, y: number) {
    setLocalCells((prev) => prev.filter((cell) => !(cell.x === x && cell.y === y)));
    setGridSelected(null);
  }

  function buildInput(spread: Spread, cells: SpreadCell[]): SpreadInput {
    return {
      no: spread.no,
      code: spread.code,
      name: spread.name,
      category: spread.category,
      levelId: spread.levelId,
      planId: spread.planId,
      guide: spread.guide ?? "",
      cells: cells.map((cell) => ({
        x: cell.x,
        y: cell.y,
        order: cell.order,
        position: cell.position,
        description: cell.description,
        isHorizontal: cell.isHorizontal,
      })),
      categoryIds: spread.categories?.map((item) => item.categoryId) ?? [],
    };
  }

  function replaceSpread(next: Spread) {
    setSpreads((prev) => {
      const exists = prev.some((spread) => spread.id === next.id);
      return exists
        ? prev.map((spread) => (spread.id === next.id ? next : spread))
        : [...prev, next];
    });
    setSelectedId(next.id);
    setLocalCells(next.cells ?? []);
  }

  function newBlank() {
    setError("");
    const defaultLevel = levels[0];
    const defaultPlan = plans[0];
    const defaultCategory = categories[0];

    if (!defaultLevel || !defaultPlan || !defaultCategory) {
      setError("スプレッド作成に必要なマスターデータが不足しています。");
      return;
    }

    startTransition(async () => {
      const result = await createSpreadAction({
        no: spreads.length + 1,
        code: `spread-${today()}`,
        name: "新規スプレッド",
        category: "その他",
        levelId: defaultLevel.id,
        planId: defaultPlan.id,
        guide: "ガイドを編集してください。",
        cells: [],
        categoryIds: [defaultCategory.id],
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      replaceSpread(result.spread);
      router.refresh();
    });
  }

  function duplicateCurrent() {
    if (!selected) return;
    setError("");

    startTransition(async () => {
      const result = await createSpreadAction({
        ...buildInput(selected, localCells),
        no: spreads.length + 1,
        code: `${selected.code}-copy-${today()}`,
        name: `${selected.name} (コピー)`,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      replaceSpread(result.spread);
      router.refresh();
    });
  }

  function saveCurrent() {
    if (!selected) return;
    setError("");

    startTransition(async () => {
      const result = await updateSpreadAction(
        selected.id,
        buildInput(selected, localCells)
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      replaceSpread(result.spread);
      router.refresh();
    });
  }

  function deleteCurrent() {
    if (!selected) return;
    if (!confirm(`「${selected.name}」を削除しますか？`)) return;
    setError("");

    startTransition(async () => {
      const result = await deleteSpreadAction(selected.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSpreads((prev) => prev.filter((spread) => spread.id !== selected.id));
      setSelectedId(null);
      setLocalCells([]);
      setGridSelected(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>🎴 スプレッド管理</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={newBlank} disabled={isPending}>
              <MdAdd className="inline mr-1" />
              新規作成
            </Button>
            <Button
              variant="outline"
              onClick={duplicateCurrent}
              disabled={!selected || isPending}
            >
              <MdContentCopy className="inline mr-1" />
              複製
            </Button>
            <Button
              variant="outline"
              onClick={deleteCurrent}
              disabled={!selected || isPending}
            >
              <MdDelete className="inline mr-1" />
              削除
            </Button>
            <Button onClick={saveCurrent} disabled={!selected || isPending}>
              <MdSave className="inline mr-1" />
              保存
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <SpreadTable
            items={spreads}
            selectedId={selectedId ?? undefined}
            onSelect={handleSelectRow}
          />
        </CardContent>
      </Card>

      {selected != null && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-2">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>🧩 スプレッド編集（{selected.name}）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SpreadLegend />
              <SpreadGrid
                cols={GRID_SIZE[0]}
                rows={GRID_SIZE[1]}
                cells={localCells}
                selected={gridSelected}
                onSelect={setGridSelected}
              />
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Card className="max-w-[380px]">
              <CardHeader>
                <CardTitle>📝 メタデータ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">No</label>
                  <Input
                    type="number"
                    value={selected.no}
                    onChange={(e) => updateSelected({ no: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">コード</label>
                  <Input
                    value={selected.code}
                    onChange={(e) => updateSelected({ code: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">名称</label>
                  <Input
                    value={selected.name}
                    onChange={(e) => updateSelected({ name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">カテゴリ表示名</label>
                  <Input
                    value={selected.category}
                    onChange={(e) => updateSelected({ category: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">難易度</label>
                  <Select
                    value={selected.levelId}
                    onValueChange={(value) => updateSelected({ levelId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name} ({level.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">プラン</label>
                  <Select
                    value={selected.planId}
                    onValueChange={(value) => updateSelected({ planId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  <label className="text-sm font-medium">読書カテゴリ</label>
                  <div className="space-y-2 rounded-md border p-2">
                    {categories.map((category) => {
                      const checked =
                        selected.categories?.some(
                          (item) => item.categoryId === category.id
                        ) ?? false;
                      return (
                        <label
                          key={category.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCategory(category.id)}
                          />
                          {category.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">ガイド</label>
                  <textarea
                    className="min-h-28 w-full rounded-md border p-2 text-sm"
                    value={selected.guide ?? ""}
                    onChange={(e) => updateSelected({ guide: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="max-w-[380px]">
              <CardHeader>
                <CardTitle>⚙️ 選択セル設定</CardTitle>
              </CardHeader>
              <CardContent>
                <SpreadSettings
                  key={gridSelected ? `${gridSelected.x}-${gridSelected.y}` : "none"}
                  selected={gridSelected}
                  cells={findGridCells()}
                  onUpsert={upsertCell}
                  onRemove={removeCell}
                  onSave={saveCurrent}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function today() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
