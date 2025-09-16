"use client";

import { SpreadGrid } from "@/components/spreads/spread-grid";
import { SpreadLegend } from "@/components/spreads/spread-legend";
import { SpreadSettings } from "@/components/spreads/spread-settings";
import { SpreadTable } from "@/components/spreads/spread-table";
import { SpreadToolbar } from "@/components/spreads/spread-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Spread, SpreadCell, SpreadMeta } from "@/lib/types";
import { nanoid } from "nanoid";
import { useEffect, useMemo, useState } from "react";
import { MdAdd, MdContentCopy, MdSave } from "react-icons/md";

export default function SpreadsPage() {
  // デモ用データ（ケルト十字・恋愛三角）
  const initialSpreads = useMemo<Spread[]>(
    () => [
      {
        id: "celtic",
        meta: {
          name: "ケルト十字",
          category: "総合",
          level: "最上級",
          plan: "コーチング",
          guide: "中央クロスから過去・未来・内外・結末へ広げて読む。",
          updatedAt: "2025-09-10",
        },
        cells: [
          { x: 1, y: 1, vLabel: "可能な未来", vOrder: 1 },
          { x: 1, y: 1, hLabel: "可能な未来", hOrder: 2 },
          { x: 1, y: 2, vLabel: "遠い過去", vOrder: 3 },
          { x: 0, y: 1, vLabel: "近い過去", vOrder: 4 },
          { x: 1, y: 0, vLabel: "可能な未来", vOrder: 5 },
          { x: 2, y: 1, vLabel: "近い未来", vOrder: 6 },
          { x: 4, y: 3, vLabel: "あなたのアプローチ", vOrder: 7 },
          { x: 4, y: 2, vLabel: "周囲の影響", vOrder: 8 },
          { x: 4, y: 1, vLabel: "内面・感情", vOrder: 9 },
          { x: 4, y: 0, vLabel: "最終結果", vOrder: 10 },
        ],
      },
      {
        id: "love-triangle",
        meta: {
          name: "恋愛三角",
          category: "恋愛",
          level: "中級者",
          plan: "スタンダード",
          guide: "心の状態／現在の愛／未来の愛の三点を結ぶ。",
          updatedAt: "2025-09-12",
        },
        cells: [
          { x: 0, y: 2, vLabel: "心の状態", vOrder: 1 },
          { x: 2, y: 2, vLabel: "現在の愛", vOrder: 2 },
          { x: 1, y: 0, vLabel: "未来の愛", vOrder: 3 },
        ],
      },
    ],
    []
  );

  const [rows, setRows] = useState<Spread[]>(initialSpreads);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 編集対象（選択時のみ下のエディタを表示）
  const selected = rows.find((r) => r.id === selectedId) || null;

  // 同じ座標のセルが複数ある場合はマージする
  // （縦カードと横カードを別々に設定できるようにするため）
  function mergeCells(cells: SpreadCell[]): SpreadCell[] {
    const mergedCells = Object.values(
      cells.reduce(
        (acc: { [key: string]: SpreadCell }, cell) => ({
          ...acc,
          [`${cell.x},${cell.y}`]: {
            ...(acc[`${cell.x},${cell.y}`] ?? {}),
            ...cell,
          },
        }),
        {}
      )
    );
    return mergedCells;
  }

  // グリッド／メタの編集用ローカル状態
  const [cells, setCells] = useState<SpreadCell[]>(selected?.cells ?? []);
  const [meta, setMeta] = useState<SpreadMeta>(
    selected?.meta ?? {
      name: "",
      category: "その他",
      level: "初心者",
      plan: "フリー",
    }
  );
  const [gridSelected, setGridSelected] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [lastOrder, setLastOrder] = useState<number>(0);

  function handleSelectRow(id: string) {
    setSelectedId(id === selectedId ? null : id);
    const s = rows.find((r) => r.id === id);
    setCells(s ? mergeCells(s.cells) : []);
    setMeta(
      s
        ? s.meta
        : { name: "", category: "その他", level: "初心者", plan: "フリー" }
    );
    setGridSelected(null);
    // 表示順の最大値を計算（新規セル追加時のデフォルト値に使う）
    const _lastOrder = s?.cells.reduce(
      (max, cell) =>
        Math.max(max, cell.vOrder ?? -Infinity, cell.hOrder ?? -Infinity),
      -Infinity
    );
    setLastOrder(
      _lastOrder == null || lastOrder === -Infinity ? 0 : _lastOrder
    );
  }

  function upsertCell(next: SpreadCell) {
    setCells((prev) => {
      const i = prev.findIndex((c) => c.x === next.x && c.y === next.y);
      if (i >= 0) {
        const cp = [...prev];
        cp[i] = next;
        return cp;
      }
      return [...prev, next];
    });
  }

  function removeCell(x: number, y: number) {
    setCells((prev) => prev.filter((c) => !(c.x === x && c.y === y)));
    setGridSelected(null);
  }

  function saveCurrent() {
    if (!selected || ["draft", "duplicate"].includes(selectedId ?? "")) {
      // 新規
      const id = nanoid(8);
      setRows((prev) => [
        ...prev,
        { id, meta: { ...meta, updatedAt: today() }, cells },
      ]);
      setSelectedId(null);
      return;
    }
    // 既存更新
    setRows((prev) =>
      prev.map((r) =>
        r.id === selected.id
          ? { ...r, meta: { ...meta, updatedAt: today() }, cells }
          : r
      )
    );
  }

  function newBlank() {
    setSelectedId("draft");
    setCells([]);
    setMeta({
      name: "新規スプレッド",
      category: "その他",
      level: "初心者",
      plan: "フリー",
      guide: "",
    });
    setGridSelected(null);
  }

  function duplicateCurrent() {
    if (!selected) return;
    setSelectedId("duplicate");
    setCells(mergeCells(selected.cells));
    setMeta({
      ...selected.meta,
      name: `${selected.meta.name} のコピー`,
      updatedAt: undefined,
    });
    setGridSelected(null);
  }

  useEffect(() => {
    console.log("selected changed", selected);
    console.log("cells changed", cells);
  }, [selected, cells]);

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
            items={rows}
            selectedId={selectedId ?? undefined}
            onSelect={handleSelectRow}
          />
        </CardContent>
      </Card>

      {/* 行を選んだらエディタ（グリッド＋設定）を表示 */}
      {selectedId != null && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-2">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>
                🧩 スプレッド編集（{meta.name || "新規スプレッド"}）
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SpreadToolbar meta={meta} onChangeMeta={setMeta} />
              <SpreadLegend />
              <SpreadGrid
                cols={10}
                rows={10}
                cells={cells}
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
                cell={
                  gridSelected
                    ? cells.find(
                        (c) => c.x === gridSelected.x && c.y === gridSelected.y
                      )
                    : undefined
                }
                onUpsert={upsertCell}
                onRemove={removeCell}
                lastOrder={lastOrder}
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
