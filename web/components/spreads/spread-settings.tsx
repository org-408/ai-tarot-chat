// components/spreads/spread-settings.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SpreadCell } from "@/lib/types";
import { MdDelete, MdUpdate } from "react-icons/md";

export function SpreadSettings({
  selected,
  cells,
  onUpsert,
  onRemove,
  onSave,
}: {
  selected: { x: number; y: number } | null;
  cells: SpreadCell[];
  onUpsert: (cells: SpreadCell[]) => void;
  onRemove: (x: number, y: number) => void;
  onSave: () => void;
}) {
  if (!selected) {
    return (
      <div className="text-sm text-zinc-600">セルを選択してください。</div>
    );
  }
  const { x, y } = selected;
  const draftV:
    | SpreadCell
    | { x: number; y: number; vLabel?: string; vOrder?: number } = cells.find(
    (c) => c.x === x && c.y === y && c.vLabel != null && c.vLabel != ""
  ) ?? { x, y };
  const draftH:
    | SpreadCell
    | { x: number; y: number; hLabel?: string; hOrder?: number } = cells.find(
    (c) => c.x === x && c.y === y && c.hLabel != null && c.hLabel != ""
  ) ?? { x, y };

  return (
    <div className="space-y-2">
      <div className="rounded-md bg-blue-50 border border-blue-300 p-2 text-sm">
        座標: ({x},{y})
      </div>

      <div className="grid gap-2">
        <div className="border gap-2 p-2 rounded-md">
          <label className="text-sm font-medium">縦カード 意味</label>
          <Input value={draftV.vLabel ?? ""} placeholder="例：現在の状況" />
          <label className="text-sm font-medium">縦カードの表示順</label>
          <Input type="number" disabled value={draftV.vOrder ?? ""} />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="destructive" onClick={() => onRemove(x, y)}>
            <MdDelete className="inline mr-1" />
            削除
          </Button>
          <Button onClick={() => onSave()}>
            <MdUpdate className="inline mr-1" />
            更新
          </Button>{" "}
        </div>

        <div className="border gap-2 p-2 rounded-md">
          <label className="text-sm font-medium">横カード 意味</label>
          <Input value={draftH.hLabel ?? ""} placeholder="例：課題・障害" />
          <label className="text-sm font-medium">横カードの表示順</label>
          <Input type="number" disabled value={draftH.hOrder ?? ""} />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="destructive" onClick={() => onRemove(x, y)}>
            <MdDelete className="inline mr-1" />
            削除
          </Button>
          <Button onClick={() => onSave()}>
            <MdUpdate className="inline mr-1" />
            更新
          </Button>{" "}
        </div>
      </div>

      {/* <div className="grid gap-2">
        <label className="text-sm font-medium">スプレッド解釈ガイド</label>
        <Textarea
          value={meta.guide ?? ""}
          onChange={(e) => onChangeMeta({ ...meta, guide: e.target.value })}
          placeholder="読み方のポイントや注意点"
        />
      </div> */}
    </div>
  );
}
