"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "📊 ダッシュボード" },
  { href: "/admin/spreads", label: "🎴 スプレッド管理" },
  { href: "/admin/decks", label: "🖼️ デッキ管理（今後）" },
  { href: "/admin/analytics", label: "📈 分析（今後）" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-64 min-w-64 border-r">
      <ScrollArea className="h-screen w-full">
        <div className="p-4">
          <div className="text-xs text-zinc-500 mb-2">メニュー</div>
          <nav className="grid gap-1">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm hover:bg-sky-100 transition",
                    active
                      ? "bg-sky-600 text-white hover:bg-sky-600"
                      : "text-slate-700"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </ScrollArea>
    </aside>
  );
}
