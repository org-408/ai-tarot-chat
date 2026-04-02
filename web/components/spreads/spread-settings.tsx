// components/spreads/spread-settings.tsx
"use client";
import type { SpreadCell } from "@/../shared/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { MdDelete, MdUpdate } from "react-icons/md";

type DraftCell = {
  position: string;
  order: number;
  description: string;
};

const EMPTY_DRAFT: DraftCell = { position: "", order: 0, description: "" };

function toDraft(cell: SpreadCell | undefined): DraftCell {
  if (!cell) return EMPTY_DRAFT;
  return {
    position: cell.position ?? "",
    order: cell.order ?? 0,
    description: cell.description ?? "",
  };
}

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
  const existingV = cells.find((c) => !c.isHorizontal);
  const existingH = cells.find((c) => c.isHorizontal);

  const [draftV, setDraftV] = useState<DraftCell>(toDraft(existingV));
  const [draftH, setDraftH] = useState<DraftCell>(toDraft(existingH));

  // セル選択が変わったら draft をリセット
  useEffect(() => {
    setDraftV(toDraft(existingV));
    setDraftH(toDraft(existingH));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.x, selected?.y]);

  if (!selected) {
    return (
      <div className="text-sm text-zinc-600">セルを選択してください。</div>
    );
  }

  const { x, y } = selected;

  function buildCell(
    draft: DraftCell,
    isHorizontal: boolean,
    existing: SpreadCell | undefined
  ): SpreadCell {
    return {
      ...(existing ?? {}),
      x,
      y,
      order: draft.order,
      position: draft.position,
      description: draft.description,
      isHorizontal,
      spreadId: existing?.spreadId ?? "",
    };
  }

  function handleUpsert() {
    const next: SpreadCell[] = [];
    if (draftV.position.trim()) next.push(buildCell(draftV, false, existingV));
    if (draftH.position.trim()) next.push(buildCell(draftH, true, existingH));
    onUpsert(next);
  }

  function handleUpsertAndSave() {
    handleUpsert();
    // upsert は state 更新なので次の tick で save
    setTimeout(() => onSave(), 0);
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md bg-blue-50 border border-blue-300 p-2 text-sm">
        座標: ({x},{y})
      </div>

      {/* 縦カード */}
      <div className="border gap-2 p-2 rounded-md space-y-1">
        <p className="text-sm font-medium">縦カード</p>
        <label className="text-xs text-zinc-500">意味（位置名）</label>
        <Input
          value={draftV.position}
          placeholder="例：現在の状況"
          onChange={(e) => setDraftV((d) => ({ ...d, position: e.target.value }))}
        />
        <label className="text-xs text-zinc-500">表示順</label>
        <Input
          type="number"
          value={draftV.order}
          onChange={(e) => setDraftV((d) => ({ ...d, order: Number(e.target.value) }))}
        />
        <label className="text-xs text-zinc-500">説明</label>
        <Input
          value={draftV.description}
          placeholder="例：現時点での状況を示します"
          onChange={(e) => setDraftV((d) => ({ ...d, description: e.target.value }))}
        />
      </div>

      {/* 横カード */}
      <div className="border gap-2 p-2 rounded-md space-y-1">
        <p className="text-sm font-medium">横カード</p>
        <label className="text-xs text-zinc-500">意味（位置名）</label>
        <Input
          value={draftH.position}
          placeholder="例：課題・障害"
          onChange={(e) => setDraftH((d) => ({ ...d, position: e.target.value }))}
        />
        <label className="text-xs text-zinc-500">表示順</label>
        <Input
          type="number"
          value={draftH.order}
          onChange={(e) => setDraftH((d) => ({ ...d, order: Number(e.target.value) }))}
        />
        <label className="text-xs text-zinc-500">説明</label>
        <Input
          value={draftH.description}
          placeholder="例：立ちはだかる障害を示します"
          onChange={(e) => setDraftH((d) => ({ ...d, description: e.target.value }))}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          variant="destructive"
          onClick={() => onRemove(x, y)}
        >
          <MdDelete className="inline mr-1" />
          削除
        </Button>
        <Button onClick={handleUpsert} variant="outline">
          反映
        </Button>
        <Button onClick={handleUpsertAndSave}>
          <MdUpdate className="inline mr-1" />
          保存
        </Button>
      </div>
    </div>
  );
}
