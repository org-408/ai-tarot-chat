import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { TrackedLink } from "@/components/analytics/tracked-link";

const OG_LOCALE: Record<string, string> = {
  ja: "ja_JP",
  en: "en_US",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = process.env.AUTH_URL ?? "https://ariadne-ai.app";
  const ogLocale = OG_LOCALE[locale] ?? "ja_JP";
  const isJa = locale === "ja";
  const t = await getTranslations({ locale, namespace: "marketing" });

  const brand = isJa ? "Ariadne - AI対話リーディング体験" : "Ariadne: AI Reflection Dialogue";
  const titleDefault = t("metaTitle");
  const description = t("metaDescription");
  const twitterDescription = isJa
    ? "8人の個性豊かなAI占い師と22種以上のスプレッドで、AIとの対話によるタロットリーディングを体験しよう"
    : "AI-facilitated tarot reflection dialogue with 8 personas and 22+ spreads.";

  return {
    title: {
      template: `%s | ${brand}`,
      default: titleDefault,
    },
    description,
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        ja: `${baseUrl}/ja`,
        en: `${baseUrl}/en`,
        "x-default": `${baseUrl}/ja`,
      },
    },
    openGraph: {
      title: titleDefault,
      description,
      type: "website",
      locale: ogLocale,
      images: [{ url: "/api/og", width: 1200, height: 630, alt: brand }],
    },
    twitter: {
      card: "summary_large_image",
      title: brand,
      description: twitterDescription,
      images: ["/api/og"],
    },
  };
}

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function MarketingLayout({ children, params }: Props) {
  const { locale } = await params;
  const baseUrl = process.env.AUTH_URL ?? "https://ariadne-ai.app";
  const isJa = locale === "ja";
  const t = await getTranslations({ locale, namespace: "marketing" });

  const brand = isJa ? "Ariadne - AI対話リーディング体験" : "Ariadne: AI Reflection Dialogue";
  const altName = isJa ? "Ariadne AI対話リーディング体験" : "Ariadne AI Reflection Dialogue";
  const jsonLdDescription = t("metaDescription");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: brand,
    alternateName: altName,
    url: `${baseUrl}/${locale}`,
    description: jsonLdDescription,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "iOS, Android, Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
    publisher: {
      "@type": "Organization",
      name: "Atelier Flow Lab",
      url: baseUrl,
    },
  };

  const navLinks = [
    { href: `/${locale}#features`, label: t("navFeatures") },
    { href: `/${locale}/pricing`, label: t("navPricing") },
    { href: `/${locale}/download`, label: t("navDownload") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ナビゲーションヘッダー */}
      <header className="sticky top-0 z-50 w-full border-b border-purple-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* ロゴ */}
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold"
              style={{ color: "#87CEEB" }}
            >
              <img
                src="/cards/back.png"
                className="w-7 h-11 object-cover rounded-sm shadow-sm"
                alt=""
              />
              <span className="hidden sm:inline">{brand}</span>
              <span className="sm:hidden">Ariadne</span>
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
              <span>{t("headerCta")}</span>
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
              <div
                className="flex items-center gap-2 font-bold text-lg mb-3"
                style={{ color: "#87CEEB" }}
              >
                <img
                  src="/cards/back.png"
                  className="w-7 h-11 object-cover rounded-sm shadow-sm"
                  alt=""
                />
                <span>{brand}</span>
              </div>
              <p className="text-sm leading-relaxed">{t("footerCopy")}</p>
            </div>

            {/* リンク */}
            <div>
              <h3 className="text-white font-semibold mb-3">
                {t("footerLinks")}
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href={`/${locale}#features`}
                    className="hover:text-white transition-colors"
                  >
                    {t("footerLinkFeatures")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${locale}/pricing`}
                    className="hover:text-white transition-colors"
                  >
                    {t("footerLinkPricing")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/${locale}/download`}
                    className="hover:text-white transition-colors"
                  >
                    {t("footerLinkDownload")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* 法的情報 */}
            <div>
              <h3 className="text-white font-semibold mb-3">
                {t("footerLegal")}
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href={`/privacy?lang=${locale}`}
                    className="hover:text-white transition-colors"
                  >
                    {isJa ? "プライバシーポリシー" : "Privacy Policy"}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/terms?lang=${locale}`}
                    className="hover:text-white transition-colors"
                  >
                    {isJa ? "利用規約" : "Terms of Service"}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-800 text-center text-xs">
            <p>© {new Date().getFullYear()} Atelier Flow Lab. All rights reserved.</p>
            <p className="mt-1 text-slate-500">{t("footerDisclaimer")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
