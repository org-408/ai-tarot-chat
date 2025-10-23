"use client";

import type { Spread, SpreadCell } from "@/../shared/lib/types";
import { SpreadGrid } from "@/components/spreads/spread-grid";
import { SpreadLegend } from "@/components/spreads/spread-legend";
import { SpreadSettings } from "@/components/spreads/spread-settings";
import { SpreadTable } from "@/components/spreads/spread-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSpreads } from "@/lib/hooks/use-spreads";
import { useState } from "react";
import { MdAdd, MdContentCopy, MdSave } from "react-icons/md";

const GRID_SIZE = [10, 10];

export default function SpreadsPage() {
  const { spreads, createSpread } = useSpreads();

  // const [rows, setRows] = useState<Spread[]>(initialSpreads);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 編集対象（選択時のみ下のエディタを表示）
  const selected: Spread | null =
    spreads.find((r) => r.id === selectedId) || null;

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
      (max: number, cell: SpreadCell) =>
        Math.max(
          max,
          cell.vOrder !== undefined && cell.vOrder !== null
            ? cell.vOrder
            : -Infinity,
          cell.hOrder !== undefined && cell.hOrder !== null
            ? cell.hOrder
            : -Infinity
        ),
      -Infinity
    );
    setLastOrder(
      _lastOrder == null || lastOrder === -Infinity ? 0 : _lastOrder
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleChange(updated: Spread) {
    // TODO:
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function upsertCell(next: SpreadCell[]) {
    // TODO:
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function removeCell(x: number, y: number) {
    // TODO:
  }

  function saveCurrent() {
    // TODO:
  }

  function newBlank() {
    createSpread({
      no: spreads.length + 1,
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
