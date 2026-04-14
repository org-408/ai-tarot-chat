import { AppSidebar } from "@/components/nav/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params;

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar locale={locale} />
        <SidebarInset>
          <header className="flex h-14 items-center gap-2 border-b px-4 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1" />
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
