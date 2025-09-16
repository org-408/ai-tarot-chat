// app/layout.tsx
import { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "Tarot Admin" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-sky-50 text-slate-900 antialiased max-w-[1400px]">
        {" "}
        {/* ★ 背景をsky-50 */}
        {children}
      </body>
    </html>
  );
}
