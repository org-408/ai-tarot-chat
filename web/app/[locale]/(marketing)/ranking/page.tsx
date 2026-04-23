import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FeatureFlagKeys,
  featureFlagService,
} from "@/lib/server/services/feature-flag";
import { rankingService } from "@/lib/server/services/ranking";
import { RankingTabs } from "./ranking-tabs";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = process.env.AUTH_URL ?? "https://ariadne-ai.app";
  return {
    title: "人気ランキング",
    description:
      "Ariadne で人気の占い師・スプレッド・ジャンル・カードをランキング形式で紹介。過去30日のデータをもとに更新。",
    alternates: {
      canonical: `${baseUrl}/${locale}/ranking`,
      languages: {
        ja: `${baseUrl}/ja/ranking`,
        en: `${baseUrl}/en/ranking`,
        "x-default": `${baseUrl}/ja/ranking`,
      },
    },
    openGraph: {
      title: "人気ランキング | Ariadne - AI Tarot Chat",
      description:
        "占い師・スプレッド・ジャンル・カードの人気ランキング。過去30日のデータから。",
      type: "website",
      images: [{ url: "/api/og", width: 1200, height: 630, alt: "Ariadne 人気ランキング" }],
    },
  };
}

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function RankingPage({ params }: Props) {
  const enabled = await featureFlagService.isEnabled(
    FeatureFlagKeys.RANKING_ENABLED
  );
  if (!enabled) notFound();

  const { locale } = await params;
  const data = await rankingService.getPublicRanking();

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-indigo-900 to-purple-800 text-white">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            人気ランキング
          </h1>
          <p className="text-purple-200 text-base sm:text-lg">
            過去{data.periodDays}日間に Ariadne で最も利用された占い師・スプレッド・ジャンル・カード
          </p>
          {data.generatedAt && (
            <p className="mt-3 text-xs text-purple-300">
              最終更新: {formatDateJst(data.generatedAt)}
            </p>
          )}
        </div>
      </section>

      {/* ===== Ranking Tabs ===== */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <RankingTabs data={data} />
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-16 bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            あなたもタロットリーディングを始めよう
          </h2>
          <p className="text-purple-200 mb-8">
            ランキング上位の占い師・スプレッドで、今すぐ占ってみませんか？
          </p>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 rounded-full bg-white text-purple-900 px-8 py-3.5 text-base font-semibold shadow-lg hover:bg-purple-50 transition-all hover:scale-105"
          >
            トップページへ
            <span>→</span>
          </Link>
        </div>
      </section>
    </>
  );
}

function formatDateJst(iso: string): string {
  const d = new Date(iso);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${hh}:${mm} JST`;
}
