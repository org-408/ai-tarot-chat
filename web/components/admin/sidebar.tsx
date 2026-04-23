"use client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-context";

const NAV = [
  { href: "/admin", label: "📊 ダッシュボード", exact: true },
  { href: "/admin/stats", label: "📈 利用統計" },
  { href: "/admin/revenue", label: "💰 収益レポート" },
  { href: "/admin/spreads", label: "🎴 スプレッド管理" },
  { href: "/admin/tarotists", label: "🔮 タロティスト管理" },
  { href: "/admin/clients", label: "👥 クライアント管理" },
  { href: "/admin/users", label: "🛡️ 管理者管理" },
  { href: "/admin/notifications", label: "📨 リリース通知" },
  { href: "/admin/x-posts", label: "𝕏 投稿管理" },
  { href: "/admin/blog", label: "📝 ブログ管理" },
  { href: "/admin/blog/feature-queue", label: "📋 機能紹介キュー" },
  { href: "/admin/ranking", label: "🏆 ランキング管理" },
  { href: "/admin/readings", label: "📖 占い履歴" },
  { href: "/admin/reset-history", label: "🔄 リセット履歴" },
  { href: "/admin/log-viewer", label: "📋 ログ管理" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { open } = useSidebar();

  return (
    <aside
      className={cn(
        "flex-none border-r overflow-y-auto overflow-x-hidden transition-all duration-200",
        open ? "w-56" : "w-0",
      )}
    >
      <div className="w-56 p-4">
        <nav className="grid gap-1">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm hover:bg-sky-100 transition whitespace-nowrap",
                  active
                    ? "bg-sky-600 text-white hover:bg-sky-600"
                    : "text-slate-700",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
