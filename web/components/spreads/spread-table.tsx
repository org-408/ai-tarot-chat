"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Spread } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  items: Spread[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
};

export function SpreadTable({ items, selectedId, onSelect }: Props) {
  return (
    <div className="rounded-xl border bg-white">
      <div className="px-4 py-3 text-sm text-zinc-600 border-b">
        スプレッド一覧
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[34%]">名前</TableHead>
              <TableHead className="w-[14%]">カテゴリ</TableHead>
              <TableHead className="w-[14%]">難易度</TableHead>
              <TableHead className="w-[14%]">プラン</TableHead>
              <TableHead className="w-[12%]">枚数</TableHead>
              <TableHead className="w-[12%] text-right">更新日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((s) => (
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
                <TableCell className="font-medium">{s.meta.name}</TableCell>
                <TableCell>{s.meta.category}</TableCell>
                <TableCell>{s.meta.level}</TableCell>
                <TableCell>{s.meta.plan}</TableCell>
                <TableCell>{s.cells.length}枚</TableCell>
                <TableCell className="text-right">
                  {s.meta.updatedAt ?? "—"}
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
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
  );
}
