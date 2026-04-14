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
} from "@/components/ui/sidebar";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { History, Settings, Sparkles, Star, User, Wand2 } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

const NAV_ITEMS = [
  { key: "salon" as const, icon: Wand2, path: "salon" },
  { key: "history" as const, icon: History, path: "history" },
  { key: "tarotists" as const, icon: Star, path: "tarotists" },
  { key: "plans" as const, icon: Sparkles, path: "plans" },
  { key: "settings" as const, icon: Settings, path: "settings" },
] as const;

export function AppSidebar({ locale }: { locale: string }) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const navigate = (path: string) => router.push(`/${locale}/${path}`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔮</span>
          <span className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent group-data-[collapsible=icon]:hidden">
            AI Tarot
          </span>
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

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name ?? ""}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <User className="w-4 h-4 text-purple-600" />
            )}
          </div>
          {session?.user ? (
            <div className="group-data-[collapsible=icon]:hidden flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session.user.name}</p>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="text-xs text-gray-500 hover:text-red-500 transition-colors"
              >
                {tCommon("signOut")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push("/auth/signin")}
              className="group-data-[collapsible=icon]:hidden text-sm text-purple-600 hover:underline"
            >
              {tCommon("signIn")}
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
