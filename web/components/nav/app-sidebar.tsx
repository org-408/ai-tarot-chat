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
import { useSalonStore } from "@/lib/client/stores/salon-store";
import { useTranslations } from "next-intl";
import { MonteCarlo } from "next/font/google";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, History, Home, Lock, Sparkles, Star, Zap, Crown } from "lucide-react";
import { useSession } from "next-auth/react";

const monteCarlo = MonteCarlo({ subsets: ["latin"], weight: "400" });

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
  const { isLocked } = useSalonStore();

  const navigate = (path: string) => router.push(path ? `/${path}` : "/");

  const planCode = usage?.plan?.code ?? "GUEST";
  const planBadgeClass = PLAN_BADGE_CLASS[planCode] ?? PLAN_BADGE_CLASS.GUEST;
  const displayName =
    session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "";

  const canPersonal = usage == null || (usage.plan?.hasPersonal ?? false);

  const NAV_ITEMS = [
    { key: "home" as const, icon: Home, path: "", disabled: false },
    { key: "quick" as const, icon: Zap, path: "simple", disabled: false },
    { key: "personal" as const, icon: Sparkles, path: "personal", disabled: !canPersonal },
    { key: "clara" as const, icon: BookOpen, path: "clara", disabled: false },
    { key: "tarotists" as const, icon: Star, path: "tarotists", disabled: false },
    { key: "plans" as const, icon: Crown, path: "plans", disabled: false },
    { key: "history" as const, icon: History, path: "history", disabled: false },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="flex-shrink-0" />
          <div className="group-data-[collapsible=icon]:hidden flex items-center gap-3 min-w-0">
            <img
              src="/tarotists/Ariadne.png"
              alt="Ariadne"
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
            <div className="leading-tight min-w-0">
              <p
                className={`${monteCarlo.className} text-2xl leading-none`}
                style={{ color: "#87CEEB" }}
              >
                Ariadne
              </p>
              <p className="text-xs text-muted-foreground mt-1">AI Tarot Chat</p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.path === ""
                    ? pathname === "/"
                    : pathname.startsWith(`/${item.path}`);
                // 占い進行中はカレントページ以外を無効化
                const lockedByProgress = isLocked && !isActive;
                const disabled = item.disabled || lockedByProgress;

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      onClick={disabled ? undefined : () => navigate(item.path)}
                      isActive={isActive}
                      tooltip={t(item.key)}
                      disabled={disabled}
                      className={disabled ? "opacity-40 cursor-not-allowed" : undefined}
                    >
                      <item.icon />
                      <span>{t(item.key)}</span>
                      {lockedByProgress && (
                        <Lock className="ml-auto h-3 w-3 text-gray-400" />
                      )}
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
              <span className="text-purple-600 text-sm font-bold">
                {displayName.charAt(0).toUpperCase() || "U"}
              </span>
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
