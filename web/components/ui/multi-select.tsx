// filepath: /Users/m_shioya/work/divination/ai-tarot-chat/web/components/ui/multi-select.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X } from "lucide-react";
import * as React from "react";

export type Option = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  noOptionsMessage?: string;
  className?: string;
  badgeClassName?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "アイテムを選択",
  noOptionsMessage = "選択可能なアイテムがありません",
  className,
  badgeClassName,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  // 選択中のアイテムをラベルで表示するための変換
  const selectedLabels = selected.map(
    (value) => options.find((option) => option.value === value)?.label || value
  );

  // アイテムの選択/選択解除を切り替える
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  // バッジのクリックで選択解除
  const removeOption = (
    e: React.MouseEvent<HTMLButtonElement>,
    value: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(selected.filter((v) => v !== value));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "min-h-10 w-full justify-between px-3 py-2 text-left",
            className
          )}
        >
          <div className="flex flex-wrap gap-1">
            {selectedLabels.length > 0 ? (
              selectedLabels.map((label) => (
                <Badge
                  key={label}
                  className={cn("mr-1 px-1", badgeClassName)}
                  variant="secondary"
                >
                  <span data-slot="badge">
                    {label}
                    <span // buttonではなくspanに変更
                      role="button" // アクセシビリティのためにrole属性を追加
                      tabIndex={0} // キーボードフォーカス可能に
                      className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                      onMouseDown={(e) => {
                        // 既存のコード
                      }}
                      onKeyDown={(e) => {
                        // Enter/Spaceキーでも削除できるように
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          // 既存のマウスダウンハンドラと同じロジック
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </span>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="検索..." />
          <CommandEmpty>{noOptionsMessage}</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => toggleOption(option.value)}
                className="flex items-center gap-2"
              >
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                    selected.includes(option.value)
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50"
                  )}
                >
                  {selected.includes(option.value) && (
                    <Check className="h-3 w-3" />
                  )}
                </div>
                <span>{option.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
