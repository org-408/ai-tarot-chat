"use client";
import type { SpreadCell } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SpreadGrid({
  cols,
  rows,
  cells,
  selected,
  onSelect,
}: {
  cols: number;
  rows: number;
  cells: SpreadCell[];
  selected: { x: number; y: number } | null;
  onSelect: (sel: { x: number; y: number } | null) => void;
}) {
  const grid = Array.from({ length: rows }).map((_, y) =>
    Array.from({ length: cols }).map((__, x) => ({ x, y }))
  );

  function onCellClick(x: number, y: number) {
    const sel =
      selected && selected.x === x && selected.y === y ? null : { x, y };
    onSelect(sel);
  }

  function findCell(x: number, y: number) {
    return cells.find((c) => c.x === x && c.y === y);
  }

  return (
    <div className="rounded-xl border border-sky-200 bg-white p-1 max-w-[770px] max-h-[770px]">
      <div className="w-full h-full max-h-[770px] overflow-x-auto overflow-y-auto">
        <div
          className="mx-auto grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${cols}, 120px)`,
            gridTemplateRows: `repeat(${rows}, 120px)`,
          }}
        >
          {grid.flat().map(({ x, y }) => {
            const c = findCell(x, y);
            const isSel = selected && selected.x === x && selected.y === y;

            const hasV = !!(
              c &&
              (c.vLabel || (c.vOrder != null && c.vOrder > 0))
            );
            const hasH = !!(
              c &&
              (c.hLabel || (c.hOrder != null && c.hOrder > 0))
            );

            return (
              <div
                key={`${x}-${y}-${isSel ? "sel" : "nosel"}`}
                onClick={() => onCellClick(x, y)}
                className={cn(
                  "relative w-[120px] h-[120px] rounded-md border-2 cursor-pointer",
                  c ? "border-sky-300 bg-sky-50" : "border-sky-200",
                  isSel ? "border-sky-400" : "border-dashed"
                )}
              >
                {/* 縦カード */}
                <div
                  className={cn(
                    "absolute p-1 top-[10px] left-[30px] w-[60px] h-[100px] rounded-md border-2 text-[10px] flex items-start justify-center",
                    hasV
                      ? "bg-blue-500/80 border-blue-600 text-white shadow z-30"
                      : "bg-transparent border-blue-300/60"
                  )}
                >
                  {c?.vOrder ?? " "}
                </div>
                {/* 横カード */}
                <div
                  className={cn(
                    "absolute p-1 top-[30px] left-[10px] w-[100px] h-[60px] rounded-md border-2 text-[10px] flex items-center justify-start",
                    hasH
                      ? "bg-pink-500/80 border-pink-600 text-white shadow z-40"
                      : "bg-transparent border-pink-300/40"
                  )}
                >
                  {c?.hOrder ?? " "}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
