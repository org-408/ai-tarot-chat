// components/spreads/spread-settings.tsx
"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SpreadCell } from "@/lib/types";
import { MdDelete, MdUpdate } from "react-icons/md";

export function SpreadSettings({
  selected,
  cell,
  onUpsert,
  onRemove,
  lastOrder,
}: {
  selected: { x: number; y: number } | null;
  cell?: SpreadCell;
  onUpsert: (c: SpreadCell) => void;
  onRemove: (x: number, y: number) => void;
  lastOrder: number;
}) {
  if (!selected) {
    return (
      <div className="text-sm text-zinc-600">セルを選択してください。</div>
    );
  }
  const { x, y } = selected;
  const draft: SpreadCell = cell ?? { x, y };

  return (
    <div className="space-y-2">
      <div className="rounded-md bg-blue-50 border border-blue-300 p-2 text-sm">
        座標: ({x},{y})
      </div>

      <div className="grid gap-2">
        <div className="border gap-2 p-2 rounded-md">
          <label className="text-sm font-medium">縦カード 意味</label>
          <Input
            value={draft.vLabel ?? ""}
            onChange={(e) => onUpsert({ ...draft, vLabel: e.target.value })}
            placeholder="例：現在の状況"
          />
          <label className="text-sm font-medium">縦カードの表示順</label>
          <Input type="number" disabled value={draft.vOrder ?? ""} />
        </div>

        <div className="border gap-2 p-2 rounded-md">
          <label className="text-sm font-medium">横カード 意味</label>
          <Input
            value={draft.hLabel ?? ""}
            onChange={(e) => onUpsert({ ...draft, hLabel: e.target.value })}
            placeholder="例：課題・障害"
          />
          <label className="text-sm font-medium">横カードの表示順</label>
          <Input type="number" disabled value={draft.hOrder ?? ""} />
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

      <div className="flex gap-2 justify-end">
        <Button variant="destructive" onClick={() => onRemove(x, y)}>
          <MdDelete className="inline mr-1" />
          削除
        </Button>
        <Button onClick={() => onUpsert(draft)}>
          <MdUpdate className="inline mr-1" />
          更新
        </Button>{" "}
      </div>
    </div>
  );
}
