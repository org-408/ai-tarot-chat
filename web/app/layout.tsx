import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import "@/components/providers";
import { Providers } from "@/components/providers";
import type { Metadata } from "next";
import { ReactNode, Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI タロット占い",
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
  ),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <GoogleAnalytics />
        <Providers>{children}</Providers>
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
      </body>
    </html>
  );
}
