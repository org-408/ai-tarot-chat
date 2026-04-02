import "@/components/providers";
import { Providers } from "@/components/providers";
import { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "AI タロット占い" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
