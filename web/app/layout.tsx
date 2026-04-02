import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import "@/components/providers";
import { Providers } from "@/components/providers";
import { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "AI タロット占い" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <GoogleAnalytics />
        <Providers>{children}</Providers>
        <PageViewTracker />
      </body>
    </html>
  );
}
