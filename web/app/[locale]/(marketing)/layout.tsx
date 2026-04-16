import type { Metadata } from "next";
import Link from "next/link";
import { TrackedLink } from "@/components/analytics/tracked-link";

export const metadata: Metadata = {
  title: {
    template: "%s | AI タロット占い",
    default: "AI タロット占い — AIが読み解くあなたの未来",
  },
  description:
    "8人の個性豊かなAI占い師と22種のスプレッドで、本格的なタロットリーディングを体験しよう。iOS・Android対応。",
  openGraph: {
    title: "AI タロット占い — AIが読み解くあなたの未来",
    description:
      "8人の個性豊かなAI占い師と22種のスプレッドで、本格的なタロットリーディングを体験しよう。iOS・Android対応。",
    type: "website",
    locale: "ja_JP",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: "AI タロット占い" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI タロット占い",
    description:
      "8人の個性豊かなAI占い師と24種以上のスプレッドで、本格的なタロットリーディングを体験しよう",
    images: ["/api/og"],
  },
};

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function MarketingLayout({ children, params }: Props) {
  const { locale } = await params;

  const navLinks = [
    { href: `/${locale}#features`, label: "機能" },
    { href: `/${locale}/pricing`, label: "料金" },
    { href: `/${locale}/download`, label: "ダウンロード" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ナビゲーションヘッダー */}
      <header className="sticky top-0 z-50 w-full border-b border-purple-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* ロゴ */}
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold text-purple-900"
            >
              <img
                src="/cards/back.png"
                className="w-7 h-11 object-cover rounded-sm shadow-sm"
                alt=""
              />
              <span className="hidden sm:inline">AI タロット占い</span>
              <span className="sm:hidden">タロット</span>
            </Link>

            {/* ナビリンク */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-slate-600 hover:text-purple-700 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* CTA */}
            <TrackedLink
              href="/auth/signin"
              pageName="marketing_layout"
              placement="header"
              ctaName="start_now"
              className="inline-flex items-center gap-2 rounded-full bg-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-800 transition-colors"
            >
              <span>今すぐ始める</span>
              <span>→</span>
            </TrackedLink>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1">{children}</main>

      {/* フッター */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* ブランド */}
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
                <img
                  src="/cards/back.png"
                  className="w-7 h-11 object-cover rounded-sm shadow-sm"
                  alt=""
                />
                <span>AI タロット占い</span>
              </div>
              <p className="text-sm leading-relaxed">
                8人のAI占い師と共に、
                <br />
                あなたの未来を読み解こう。
              </p>
            </div>

            {/* リンク */}
            <div>
              <h3 className="text-white font-semibold mb-3">リンク</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href={`/${locale}#features`}
                    className="hover:text-white transition-colors"
                  >
                    機能紹介
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${locale}/pricing`}
                    className="hover:text-white transition-colors"
                  >
                    料金プラン
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${locale}/download`}
                    className="hover:text-white transition-colors"
                  >
                    ダウンロード
                  </Link>
                </li>
              </ul>
            </div>

            {/* 法的情報 */}
            <div>
              <h3 className="text-white font-semibold mb-3">法的情報</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    プライバシーポリシー
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    利用規約
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-800 text-center text-xs">
            <p>© {new Date().getFullYear()} Atelier Flow Lab. All rights reserved.</p>
            <p className="mt-1 text-slate-500">
              ※占いはエンターテインメントを目的としており、結果を保証するものではありません。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
