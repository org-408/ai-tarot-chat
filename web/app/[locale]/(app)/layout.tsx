import { auth } from "@/auth";
import { WebSessionInitializer } from "@/components/auth/web-session-initializer";
import { AppSidebar } from "@/components/nav/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AppLayout({ children, params }: Props) {
  const session = await auth();
  if (!session) {
    redirect("/auth/signin");
  }

  const { locale } = await params;

  return (
    <TooltipProvider>
      <SidebarProvider>
        {/* Web セッション初期化: access_token cookie をセットする */}
        <WebSessionInitializer />
        <AppSidebar locale={locale} />
        <SidebarInset>
          <header className="flex h-14 items-center gap-2 border-b px-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1" />
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
