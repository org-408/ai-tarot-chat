"use client";

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
import { useState } from "react";
import { MdCheck, MdUnfoldMore } from "react-icons/md";

export type ClientOption = {
  id: string;
  name: string | null;
  email: string | null;
};

export function ClientCombobox({
  clients,
  value,
  onChange,
}: {
  clients: ClientOption[];
  value: string;
  onChange: (clientId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = clients.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-52 justify-between font-normal text-sm h-9"
        >
          <span className="truncate text-left">
            {selected
              ? (selected.name ?? selected.email ?? selected.id.slice(0, 8) + "…")
              : <span className="text-slate-400">クライアントを選択...</span>}
          </span>
          <MdUnfoldMore className="ml-2 shrink-0 opacity-50" size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="名前・メール・IDで検索..." />
          <CommandEmpty>見つかりません</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {value && (
              <CommandItem
                value="__clear__"
                onSelect={() => { onChange(""); setOpen(false); }}
                className="text-slate-400 text-xs"
              >
                ✕ 選択を解除
              </CommandItem>
            )}
            {clients.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.name ?? ""} ${c.email ?? ""} ${c.id}`}
                onSelect={() => { onChange(c.id); setOpen(false); }}
              >
                <MdCheck
                  size={14}
                  className={`mr-2 shrink-0 ${value === c.id ? "opacity-100" : "opacity-0"}`}
                />
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{c.name ?? "(名前なし)"}</span>
                  {c.email && (
                    <span className="text-xs text-slate-400 truncate">{c.email}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
