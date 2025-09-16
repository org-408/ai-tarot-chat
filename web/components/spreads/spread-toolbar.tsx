"use client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SpreadMeta } from "@/lib/types";

export function SpreadToolbar({
  meta,
  onChangeMeta,
}: {
  meta: SpreadMeta;
  onChangeMeta: (m: SpreadMeta) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <div className="grid gap-1">
        <label className="text-sm font-medium">📝 スプレッド名</label>
        <Input
          value={meta.name}
          onChange={(e) => onChangeMeta({ ...meta, name: e.target.value })}
          placeholder="スプレッド名"
        />
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium">📂 カテゴリ</label>
        <Select
          value={meta.category}
          onValueChange={(v) =>
            onChangeMeta({ ...meta, category: v as SpreadMeta["category"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              "総合",
              "恋愛",
              "仕事",
              "金運",
              "健康",
              "学業",
              "人間関係",
              "その他",
            ].map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium">⭐ 難易度</label>
        <Select
          value={meta.level}
          onValueChange={(v) =>
            onChangeMeta({ ...meta, level: v as SpreadMeta["level"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["初心者", "中級者", "上級者", "最上級"].map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-medium">💎 必要プラン</label>
        <Select
          value={meta.plan}
          onValueChange={(v) =>
            onChangeMeta({ ...meta, plan: v as SpreadMeta["plan"] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["フリー", "スタンダード", "コーチング"].map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* <div className="lg:col-span-4 flex gap-2 justify-end">
        <Button
          variant="secondary"
          className="bg-sky-100 text-sky-800 hover:bg-sky-200"
        >
          📋 複製
        </Button>
        <Button
          variant="outline"
          className="border-sky-300 text-sky-700 hover:bg-sky-50"
        >
          👁️ プレビュー
        </Button>
        <Button className="bg-sky-600 hover:bg-sky-700">💾 保存</Button>
      </div> */}
    </div>
  );
}
