import type { Metadata } from "next";
import { TrackedLink } from "@/components/analytics/tracked-link";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { tarotistService } from "@/lib/server/services";
import type { Tarotist } from "@/../shared/lib/types";
import { TarotistsSection } from "@/components/marketing/tarotists-section";
import { NotifyForm } from "@/components/marketing/notify-form";
import { HeroStars } from "@/components/marketing/hero-stars";
import { HeroCards } from "@/components/marketing/hero-cards";
import { CTACards } from "@/components/marketing/cta-cards";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

interface Props {
  params: Promise<{ locale: string }>;
}

const FEATURE_ICONS = ["🧙‍♀️", "🃏", "💬", "📱"] as const;

const SPREADS: Array<{
  key: string;
  cards: number;
  categoryKey: string;
  planKey: "planNameFree" | "planNameStandard" | "planNamePremium";
}> = [
  { key: "spreadOneCard", cards: 1, categoryKey: "categoryAll", planKey: "planNameFree" },
  { key: "spreadThreePastFuture", cards: 3, categoryKey: "categoryAll", planKey: "planNameFree" },
  { key: "spreadThreeAction", cards: 3, categoryKey: "categoryAll", planKey: "planNameFree" },
  { key: "spreadLoveTriangle", cards: 3, categoryKey: "categoryLove", planKey: "planNameStandard" },
  { key: "spreadReunion", cards: 4, categoryKey: "categoryLove", planKey: "planNameStandard" },
  { key: "spreadFiveCards", cards: 5, categoryKey: "categoryGeneral", planKey: "planNameStandard" },
  { key: "spreadCareer", cards: 7, categoryKey: "categoryWork", planKey: "planNameStandard" },
  { key: "spreadHorseshoe", cards: 7, categoryKey: "categoryAll", planKey: "planNameStandard" },
  { key: "spreadCelticCross", cards: 10, categoryKey: "categoryAll", planKey: "planNameStandard" },
  { key: "spreadYear", cards: 12, categoryKey: "categoryAll", planKey: "planNamePremium" },
  { key: "spreadAstrological", cards: 12, categoryKey: "categorySpiritual", planKey: "planNamePremium" },
  { key: "spreadTreeOfLife", cards: 10, categoryKey: "categorySpiritual", planKey: "planNamePremium" },
];

interface PlanCard {
  nameKey: "planNameGuest" | "planNameFree" | "planNameStandard" | "planNamePremium";
  priceKey: "planPriceFree" | "planPriceStandard" | "planPricePremium";
  color: string;
  headingColor: string;
  badgeKey: "planBadgePopular" | "planBadgeRecommended" | null;
  featureKeys: string[];
}

const PLAN_HIGHLIGHTS: PlanCard[] = [
  {
    nameKey: "planNameGuest",
    priceKey: "planPriceFree",
    color: "bg-slate-100 border-slate-200",
    headingColor: "text-slate-700",
    badgeKey: null,
    featureKeys: ["planFeatureOnceDaily", "planFeatureThreeSpreads", "planFeatureWithAds"],
  },
  {
    nameKey: "planNameFree",
    priceKey: "planPriceFree",
    color: "bg-green-50 border-green-200",
    headingColor: "text-green-700",
    badgeKey: null,
    featureKeys: [
      "planFeatureThreeDaily",
      "planFeatureThreeSpreads",
      "planFeatureHistory",
      "planFeatureWithAds",
    ],
  },
  {
    nameKey: "planNameStandard",
    priceKey: "planPriceStandard",
    color: "bg-blue-50 border-blue-200",
    headingColor: "text-blue-700",
    badgeKey: "planBadgePopular",
    featureKeys: [
      "planFeatureThreeDaily",
      "planFeatureTwentyTwoSpreads",
      "planFeatureCelticIncluded",
      "planFeatureNoAds",
    ],
  },
  {
    nameKey: "planNamePremium",
    priceKey: "planPricePremium",
    color: "bg-yellow-50 border-yellow-200",
    headingColor: "text-yellow-700",
    badgeKey: "planBadgeRecommended",
    featureKeys: [
      "planFeatureThreeDaily",
      "planFeatureAllSpreads",
      "planFeatureDialogReading",
      "planFeatureAiDialogue",
      "planFeatureNoAds",
    ],
  },
];

export default async function LandingPage({ params }: Props) {
  // ログイン済みならアプリへ直行
  const session = await auth();
  if (session) redirect("/");

  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing" });

  // DBから占い師一覧を取得。接続できない場合は空配列にフォールバック
  const tarotists = await tarotistService.getAllTarotists().catch(() => [] as Tarotist[]);

  const features = [0, 1, 2, 3].map((i) => ({
    icon: FEATURE_ICONS[i],
    title: t(`feature${i + 1}Title`),
    description: t(`feature${i + 1}Desc`),
  }));

  return (
    <>
      {/* ===== Hero Section ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-indigo-900 to-purple-800 text-white">
        {/* 背景の装飾 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-3xl" />
          <HeroStars />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            {/* ラベル */}
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/20 border border-purple-400/30 px-4 py-1.5 text-sm text-purple-200 mb-8">
              <span>✨</span>
              <span>{t("heroBadge")}</span>
            </div>

            {/* メインタイトル */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              {t("heroTitleLine1")}
              <br />
              <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
                {t("heroTitleLine2")}
              </span>
            </h1>

            {/* サブタイトル */}
            <p className="text-lg sm:text-xl text-purple-200 max-w-2xl mx-auto mb-10 leading-relaxed">
              {t("heroSubtitle1")}
              <br className="hidden sm:block" />
              {t("heroSubtitle2")}
            </p>

            {/* CTAボタン */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <TrackedLink
                href="/auth/signin"
                pageName="landing"
                placement="hero"
                ctaName="start_web"
                className="inline-flex items-center gap-2 rounded-full bg-white text-purple-900 px-8 py-3.5 text-base font-semibold shadow-lg hover:bg-purple-50 transition-all hover:scale-105"
              >
                <span>✨</span>
                {t("heroCtaStart")}
              </TrackedLink>
              <TrackedLink
                href={`/${locale}/download`}
                pageName="landing"
                placement="hero"
                ctaName="download_app"
                className="inline-flex items-center gap-2 rounded-full border border-purple-400/50 text-white px-8 py-3.5 text-base font-semibold hover:bg-purple-500/20 transition-all"
              >
                <span>📱</span>
                {t("heroCtaDownload")}
              </TrackedLink>
            </div>

            {/* 無料バッジ */}
            <p className="mt-6 text-sm text-purple-300">{t("heroNotice")}</p>
          </div>

          {/* タロットカードの装飾 */}
          <HeroCards />
        </div>
      </section>

      {/* ===== Features Section ===== */}
      <section id="features" className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              {t("featuresTitle")}
            </h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">
              {t("featuresSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex gap-4 p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Tarotists Section ===== */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-slate-50 to-purple-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              {tarotists.length > 0
                ? t("tarotistsTitleWithCount", { count: tarotists.length })
                : t("tarotistsTitleFallback")}
            </h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">
              {t("tarotistsSubtitle1")}
              <br />
              {t("tarotistsSubtitle2")}
            </p>
          </div>

          <TarotistsSection tarotists={tarotists} />
        </div>
      </section>

      {/* ===== Spreads Section ===== */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              {t("spreadsTitle")}
            </h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">
              {t("spreadsSubtitle1")}
              <br />
              {t("spreadsSubtitle2")}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {SPREADS.map((s) => (
              <div
                key={s.key}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-purple-600 bg-purple-100 rounded-full px-2 py-0.5">
                    {t("spreadCardCount", { count: s.cards })}
                  </span>
                  <span className="text-xs text-slate-400">{t(s.planKey)}</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{t(s.key)}</p>
                <p className="text-xs text-slate-500 mt-1">{t(s.categoryKey)}</p>
              </div>
            ))}

            {/* 残り */}
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 flex items-center justify-center">
              <p className="text-sm text-slate-400 text-center">
                {t("spreadMore1")}
                <br />
                {t("spreadMore2")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Pricing Preview Section ===== */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              {t("pricingTitle")}
            </h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">
              {t("pricingSubtitle1")}
              <br />
              {t("pricingSubtitle2")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLAN_HIGHLIGHTS.map((plan) => (
              <div
                key={plan.nameKey}
                className={`relative rounded-2xl border p-6 bg-white shadow-sm hover:shadow-md transition-all ${plan.color}`}
              >
                {plan.badgeKey && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-white bg-purple-600 rounded-full px-3 py-1">
                    {t(plan.badgeKey)}
                  </span>
                )}
                <h3 className={`font-bold text-lg mb-1 ${plan.headingColor}`}>
                  {t(plan.nameKey)}
                </h3>
                <p className="text-2xl font-bold text-slate-900 mb-4">
                  {t(plan.priceKey)}
                </p>
                <ul className="space-y-2">
                  {plan.featureKeys.map((fk) => (
                    <li
                      key={fk}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      {t(fk)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href={`/${locale}/pricing`}
              className="inline-flex items-center gap-2 rounded-full border-2 border-purple-700 text-purple-700 px-8 py-3 text-base font-semibold hover:bg-purple-700 hover:text-white transition-all"
            >
              {t("pricingDetailLink")}
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Download CTA Section ===== */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-purple-950 via-indigo-900 to-purple-800 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <CTACards />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            {t("downloadTitle")}
          </h2>
          <p className="text-purple-200 text-lg max-w-xl mx-auto mb-10">
            {t("downloadSubtitle1")}
            <br />
            {t("downloadSubtitle2")}
          </p>
          <NotifyForm />
        </div>
      </section>
    </>
  );
}
