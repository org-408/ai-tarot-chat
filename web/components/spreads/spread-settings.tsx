// components/spreads/spread-settings.tsx
"use client";
import type { SpreadCell } from "@/../shared/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MdDelete, MdUpdate } from "react-icons/md";

export function SpreadSettings({
  selected,
  cells,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    | { x: number; y: number; position?: string; order?: number } = cells.find(
    (c) =>
      c.x === x &&
      c.y === y &&
      c.position != null &&
      c.position != "" &&
      !c.isHorizontal
  ) ?? { x, y };
  const draftH:
    | SpreadCell
    | { x: number; y: number; position?: string; order?: number } = cells.find(
    (c) =>
      c.x === x &&
      c.y === y &&
      c.position != null &&
      c.position != "" &&
      c.isHorizontal
  ) ?? { x, y };

  return (
    <div className="space-y-2">
      <div className="rounded-md bg-blue-50 border border-blue-300 p-2 text-sm">
        座標: ({x},{y})
      </div>

      <div className="grid gap-2">
        <div className="border gap-2 p-2 rounded-md">
          <label className="text-sm font-medium">縦カード 意味</label>
          <Input value={draftV.position ?? ""} placeholder="例：現在の状況" />
          <label className="text-sm font-medium">縦カードの表示順</label>
          <Input type="number" disabled value={draftV.order ?? ""} />
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
          <Input value={draftH.position ?? ""} placeholder="例：課題・障害" />
          <label className="text-sm font-medium">横カードの表示順</label>
          <Input type="number" disabled value={draftH.order ?? ""} />
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
