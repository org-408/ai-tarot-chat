"use client";

import { SpreadGrid } from "@/components/spreads/spread-grid";
import { SpreadLegend } from "@/components/spreads/spread-legend";
import { SpreadSettings } from "@/components/spreads/spread-settings";
import { SpreadTable } from "@/components/spreads/spread-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSpreads } from "@/lib/hooks/use-spreads";
import type { Spread, SpreadCell } from "@/lib/types";
import { useState } from "react";
import { MdAdd, MdContentCopy, MdSave } from "react-icons/md";

const GRID_SIZE = [10, 10];

export default function SpreadsPage() {
  // デモ用データ（ケルト十字・恋愛三角）
  // const initialSpreads = useMemo<Spread[]>(
  //   () => [
  //     {
  //       id: "1",
  //       name: "ケルト十字",
  //       category: "総合",
  //       level: "最上級",
  //       plan: "プレミアム",
  //       guide: "中央クロスから過去・未来・内外・結末へ広げて読む。",
  //       updatedAt: "2025-09-10",
  //       cells: [
  //         { id: "1", x: 1, y: 1, vLabel: "可能な未来", vOrder: 1 },
  //         { id: "2", x: 1, y: 1, hLabel: "可能な未来", hOrder: 2 },
  //         { id: "3", x: 1, y: 2, vLabel: "遠い過去", vOrder: 3 },
  //         { id: "4", x: 0, y: 1, vLabel: "近い過去", vOrder: 4 },
  //         { id: "5", x: 1, y: 0, vLabel: "可能な未来", vOrder: 5 },
  //         { id: "6", x: 2, y: 1, vLabel: "近い未来", vOrder: 6 },
  //         { id: "7", x: 4, y: 3, vLabel: "あなたのアプローチ", vOrder: 7 },
  //         { id: "8", x: 4, y: 2, vLabel: "周囲の影響", vOrder: 8 },
  //         { id: "9", x: 4, y: 1, vLabel: "内面・感情", vOrder: 9 },
  //         { id: "10", x: 4, y: 0, vLabel: "最終結果", vOrder: 10 },
  //       ],
  //     },
  //     {
  //       id: "2",
  //       name: "恋愛三角",
  //       category: "恋愛",
  //       level: "中級者",
  //       plan: "スタンダード",
  //       guide: "心の状態／現在の愛／未来の愛の三点を結ぶ。",
  //       updatedAt: "2025-09-12",
  //       cells: [
  //         { id: "11", x: 0, y: 2, vLabel: "心の状態", vOrder: 1 },
  //         { id: "12", x: 2, y: 2, vLabel: "現在の愛", vOrder: 2 },
  //         { id: "13", x: 1, y: 0, vLabel: "未来の愛", vOrder: 3 },
  //       ],
  //     },
  //   ],
  //   []
  // );
  const { spreads, loading, error, createSpread, updateSpread, deleteSpread } =
    useSpreads();

  // const [rows, setRows] = useState<Spread[]>(initialSpreads);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 編集対象（選択時のみ下のエディタを表示）
  const selected = spreads.find((r) => r.id === selectedId) || null;

  const [gridSelected, setGridSelected] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [lastOrder, setLastOrder] = useState<number>(0);

  function findGridCells() {
    if (!selected || !gridSelected) return [];
    return (selected.cells || []).filter(
      (c) => c.x === gridSelected.x && c.y === gridSelected.y
    );
  }

  function handleSelectRow(id: string) {
    setSelectedId(id === selectedId ? null : id);
    const s = spreads.find((r) => r.id === id);
    setGridSelected(null);
    // 表示順の最大値を計算（新規セル追加時のデフォルト値に使う）
    const cells = s?.cells || [];
    const _lastOrder = cells.reduce(
      (max, cell) =>
        Math.max(max, cell.vOrder ?? -Infinity, cell.hOrder ?? -Infinity),
      -Infinity
    );
    setLastOrder(
      _lastOrder == null || lastOrder === -Infinity ? 0 : _lastOrder
    );
  }

  function handleChange(updated: Spread) {
    // TODO:
  }

  function upsertCell(next: SpreadCell[]) {
    // TODO:
  }

  function removeCell(x: number, y: number) {
    // TODO:
  }

  function saveCurrent() {
    // TODO:
  }

  function newBlank() {
    createSpread({
      code: `spread-${today()}`,
      name: "新規スプレッド",
      category: "その他",
      levelId: "BEGINNER",
      planId: "FREE",
      guide: "ガイドを編集してください。",
      cells: [],
      categoryIds: ["総合"],
    }).then((newSpread) => {
      if (newSpread) {
        handleSelectRow(newSpread.id);
      }
    });
  }

  function duplicateCurrent() {
    // 既存スプレッドを複製し、セレクト状態にする
  }

  return (
    <div className="space-y-2">
      {/* 一覧とアクション */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>🎴 スプレッド管理</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={newBlank}>
              <MdAdd className="inline mr-1" />
              新規作成
            </Button>
            <Button
              variant="outline"
              onClick={duplicateCurrent}
              disabled={!selected}
            >
              <MdContentCopy className="inline mr-1" />
              複製
            </Button>
            <Button onClick={saveCurrent}>
              <MdSave className="inline mr-1" />
              保存
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <SpreadTable
            items={spreads}
            selectedId={selectedId ?? undefined}
            onSelect={handleSelectRow}
          />
        </CardContent>
      </Card>

      {/* 行を選んだらエディタ（グリッド＋設定）を表示 */}
      {selected != null && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-2">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>🧩 スプレッド編集（{selected.name}）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* <SpreadToolbar spread={selected} onChange={handleChange} /> */}
              <SpreadLegend />
              <SpreadGrid
                cols={GRID_SIZE[0]}
                rows={GRID_SIZE[1]}
                cells={selected?.cells || []}
                selected={gridSelected}
                onSelect={setGridSelected}
              />
            </CardContent>
          </Card>

          <Card className=" max-w-[300px]">
            <CardHeader>
              <CardTitle>⚙️ 選択セル設定</CardTitle>
            </CardHeader>
            <CardContent>
              <SpreadSettings
                key={
                  gridSelected ? `${gridSelected.x}-${gridSelected.y}` : "none"
                }
                selected={gridSelected}
                cells={findGridCells()}
                onUpsert={upsertCell}
                onRemove={removeCell}
                onSave={saveCurrent}
              />
            </CardContent>
          </Card>
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
