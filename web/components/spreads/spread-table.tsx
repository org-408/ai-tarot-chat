"use client";

import type { Spread } from "@/../shared/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Props = {
  items: Spread[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
};

export function SpreadTable({ items, selectedId, onSelect }: Props) {
  return (
    <div className="rounded-xl border bg-white flex flex-col">
      <div className="px-4 py-3 text-sm text-zinc-600 border-b">
        スプレッド一覧
      </div>
      <div className="grid grid-rows-[auto_1fr]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[12%]">No.</TableHead>
                <TableHead className="w-[22%]">名前</TableHead>
                <TableHead className="w-[14%]">カテゴリ</TableHead>
                <TableHead className="w-[14%]">難易度</TableHead>
                <TableHead className="w-[14%]">プラン</TableHead>
                <TableHead className="w-[12%]">枚数</TableHead>
                <TableHead className="w-[12%] text-right">更新日</TableHead>
              </TableRow>
            </TableHeader>
          </Table>
        </div>
        <div className="overflow-y-auto max-h-[160px]">
          <Table>
            <TableBody>
              {items.map((s, index) => (
                <TableRow
                  key={s.id}
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    "cursor-pointer",
                    selectedId === s.id
                      ? "bg-sky-50/60 hover:bg-sky-50"
                      : "hover:bg-zinc-50"
                  )}
                >
                  <TableCell className="w-[12%] font-medium">
                    {index + 1}
                  </TableCell>
                  <TableCell className="w-[22%] font-medium">
                    {s.name}
                  </TableCell>
                  <TableCell className="w-[14%]">{s.category}</TableCell>
                  <TableCell className="w-[14%]">{s.level?.name}</TableCell>
                  <TableCell className="w-[14%]">{s.plan?.name}</TableCell>
                  <TableCell className="w-[12%]">{s.cells.length}枚</TableCell>
                  <TableCell className="w-[12%] text-right">
                    {new Date(s.updatedAt).toLocaleString("ja-JP")}
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-zinc-500 py-10"
                  >
                    スプレッドはまだありません。「新規作成」から追加してください。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
