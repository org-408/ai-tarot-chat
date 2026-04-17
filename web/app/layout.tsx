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
    process.env.AUTH_URL ?? "https://ariadne-ai.app"
  ),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* ダークモード FOUC 防止: localStorage の theme を読んで class を事前適用 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <GoogleAnalytics />
        <Providers>{children}</Providers>
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
      </body>
    </html>
  );
}
