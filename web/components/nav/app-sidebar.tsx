"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useClientStore } from "@/lib/client/stores/client-store";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { History, Sparkles, Star, User, Wand2 } from "lucide-react";
import { useSession } from "next-auth/react";

const NAV_ITEMS = [
  { key: "salon" as const, icon: Wand2, path: "salon" },
  { key: "history" as const, icon: History, path: "history" },
  { key: "tarotists" as const, icon: Star, path: "tarotists" },
  { key: "plans" as const, icon: Sparkles, path: "plans" },
] as const;

const PLAN_BADGE_CLASS: Record<string, string> = {
  PREMIUM: "bg-amber-100 text-amber-700",
  STANDARD: "bg-accent text-accent-foreground",
  FREE: "bg-muted text-muted-foreground",
  GUEST: "bg-muted text-muted-foreground",
};

export function AppSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { usage } = useClientStore();

  const navigate = (path: string) => router.push(`/${path}`);

  const planCode = usage?.plan?.code ?? "GUEST";
  const planBadgeClass = PLAN_BADGE_CLASS[planCode] ?? PLAN_BADGE_CLASS.GUEST;
  const displayName =
    session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="flex-shrink-0" />
          <div className="group-data-[collapsible=icon]:hidden flex items-center gap-2 min-w-0">
            <img
              src="/tarotists/Ariadne.png"
              alt="Ariadne"
              className="w-6 h-6 rounded-full object-cover flex-shrink-0"
            />
            <div className="leading-tight min-w-0">
              <p className="font-bold text-sm bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Ariadne
              </p>
              <p className="text-[10px] text-muted-foreground">AI Tarot Chat</p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.includes(`/${item.path}`);
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.path)}
                      isActive={isActive}
                      tooltip={t(item.key)}
                    >
                      <item.icon />
                      <span>{t(item.key)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* クリックで設定ページへ（Claude/ChatGPT スタイル） */}
      <SidebarFooter className="p-3">
        <button
          type="button"
          onClick={() => navigate("settings")}
          className="flex items-center gap-2 w-full rounded-lg p-2 hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:justify-center"
        >
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={displayName}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <User className="w-4 h-4 text-purple-600" />
            )}
          </div>
          <div className="group-data-[collapsible=icon]:hidden flex-1 min-w-0 text-left">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <span
              className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${planBadgeClass}`}
            >
              {planCode}
            </span>
          </div>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
