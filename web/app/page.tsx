import { auth } from "@/auth";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { SessionExpiredBanner } from "@/components/providers/session-expired-banner";
import { UsagePoller } from "@/components/providers/usage-poller";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { routing } from "@/i18n/routing";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import HomeClient from "./home-client";

export default async function RootPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale =
    cookieLocale && routing.locales.includes(cookieLocale as "ja" | "en")
      ? (cookieLocale as "ja" | "en")
      : routing.defaultLocale;
  const messages = (await import(`@/messages/${locale}.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <TooltipProvider>
        <SidebarProvider>
          <UsagePoller />
          <SessionExpiredBanner />
          <AppSidebar />
          <SidebarInset>
            <main className="flex-1 p-4 md:p-6">
              <HomeClient />
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </NextIntlClientProvider>
  );
}
