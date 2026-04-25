import type { Metadata } from "next";
import { TrackedLink } from "@/components/analytics/tracked-link";
import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { tarotistService } from "@/lib/server/services";
import type { Tarotist } from "@/../shared/lib/types";
import { TarotistsSection } from "@/components/marketing/tarotists-section";
import { NotifyForm } from "@/components/marketing/notify-form";
import { HeroStars } from "@/components/marketing/hero-stars";
import { HeroCards } from "@/components/marketing/hero-cards";
import { CTACards } from "@/components/marketing/cta-cards";

export const metadata: Metadata = {
  title: "Ariadne - AI対話リーディング体験 — AIとの対話で読み解く、あなたの内側",
  description:
    "8人の個性豊かなAI占い師と22種のスプレッドで、AIとの対話を通じたタロットリーディングを体験しよう。iOS・Android対応。無料プランあり。",
};

const features = [
  {
    icon: "🧙‍♀️",
    title: "8人の個性豊かなAI占い師",
    description:
      "駆け出しから至高まで、それぞれ異なる個性を持つAI占い師。あなたの気分や悩みに合ったキャラクターを選べます。",
  },
  {
    icon: "🃏",
    title: "22種のスプレッド",
    description:
      "ワンカードから10枚のケルト十字、12ヶ月のイヤースプレッドまで。恋愛・仕事・金運など幅広いテーマに対応。",
  },
  {
    icon: "💬",
    title: "対話型リーディング",
    description:
      "リーディング結果に疑問があればその場で質問できます（プレミアム）。AIがあなたの状況を深く理解して寄り添います。",
  },
  {
    icon: "📱",
    title: "iOS・Android アプリ対応",
    description:
      "iPhone・iPad・Androidスマートフォン・タブレットでご利用いただけます（近日公開）。",
  },
];

const spreads = [
  { name: "ワンカード", cards: 1, category: "全カテゴリ", plan: "無料" },
  { name: "3枚引き（過去/現在/未来）", cards: 3, category: "全カテゴリ", plan: "無料" },
  { name: "3枚引き（状況/行動/結果）", cards: 3, category: "全カテゴリ", plan: "無料" },
  { name: "恋愛三角", cards: 3, category: "恋愛", plan: "スタンダード" },
  { name: "復縁スプレッド", cards: 4, category: "恋愛", plan: "スタンダード" },
  { name: "5枚スプレッド", cards: 5, category: "総合", plan: "スタンダード" },
  { name: "キャリアパス", cards: 7, category: "仕事", plan: "スタンダード" },
  { name: "ホースシュー", cards: 7, category: "全カテゴリ", plan: "スタンダード" },
  { name: "ケルト十字", cards: 10, category: "全カテゴリ", plan: "スタンダード" },
  { name: "イヤースプレッド", cards: 12, category: "全カテゴリ", plan: "プレミアム" },
  { name: "アストロロジカル", cards: 12, category: "スピリチュアル", plan: "プレミアム" },
  { name: "生命の樹", cards: 10, category: "スピリチュアル", plan: "プレミアム" },
];

const planHighlights = [
  {
    name: "ゲスト",
    price: "無料",
    color: "bg-slate-100 border-slate-200",
    headingColor: "text-slate-700",
    badge: null,
    features: ["1日1回", "3種のスプレッド", "広告あり"],
  },
  {
    name: "フリー",
    price: "無料",
    color: "bg-green-50 border-green-200",
    headingColor: "text-green-700",
    badge: null,
    features: ["1日3回", "3種のスプレッド", "履歴保存", "広告あり"],
  },
  {
    name: "スタンダード",
    price: "¥480/月",
    color: "bg-blue-50 border-blue-200",
    headingColor: "text-blue-700",
    badge: "人気",
    features: ["1日3回", "22種のスプレッド", "ケルト十字を含む", "広告なし"],
  },
  {
    name: "プレミアム",
    price: "¥980/月",
    color: "bg-yellow-50 border-yellow-200",
    headingColor: "text-yellow-700",
    badge: "おすすめ",
    features: ["1日3回", "全スプレッド", "対話リーディング", "AI対話", "広告なし"],
  },
];

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function LandingPage({ params }: Props) {
  // ログイン済みならアプリへ直行
  const session = await auth();
  if (session) redirect("/");

  const { locale } = await params;

  // DBから占い師一覧を取得。接続できない場合は空配列にフォールバック
  const tarotists = await tarotistService.getAllTarotists().catch(() => [] as Tarotist[]);

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
              <span>8人のAI占い師があなたの悩みに寄り添います</span>
            </div>

            {/* メインタイトル */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-tight">
              AIが読み解く
              <br />
              <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
                あなたの未来
              </span>
            </h1>

            {/* サブタイトル */}
            <p className="text-lg sm:text-xl text-purple-200 max-w-2xl mx-auto mb-10 leading-relaxed">
              個性豊かな8人のAI占い師と、22種のスプレッドで
              <br className="hidden sm:block" />
              AIとの対話を通じたタロットリーディングを体験しよう。
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
                今すぐ無料で始める
              </TrackedLink>
              <TrackedLink
                href={`/${locale}/download`}
                pageName="landing"
                placement="hero"
                ctaName="download_app"
                className="inline-flex items-center gap-2 rounded-full border border-purple-400/50 text-white px-8 py-3.5 text-base font-semibold hover:bg-purple-500/20 transition-all"
              >
                <span>📱</span>
                アプリをダウンロード
              </TrackedLink>
            </div>

            {/* 無料バッジ */}
            <p className="mt-6 text-sm text-purple-300">
              近日公開予定 — リリース通知を受け取る
            </p>
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
              なぜ Ariadne なのか
            </h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">
              最先端のAIと伝統のタロットが融合した、まったく新しい対話リーディング体験。
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
              {tarotists.length > 0 ? `${tarotists.length}人` : "個性豊かな"}のAI占い師
            </h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">
              それぞれ異なる個性と得意分野を持つAI占い師たち。
              <br />
              あなたにぴったりの一人を見つけよう。
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
              22種のスプレッド
            </h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">
              シンプルなワンカードから複雑なケルト十字まで。
              <br />
              あなたの悩みに合ったスプレッドが見つかります。
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {spreads.map((s) => (
              <div
                key={s.name}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4 hover:border-purple-200 hover:bg-purple-50/30 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-purple-600 bg-purple-100 rounded-full px-2 py-0.5">
                    {s.cards}枚
                  </span>
                  <span className="text-xs text-slate-400">{s.plan}</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{s.name}</p>
                <p className="text-xs text-slate-500 mt-1">{s.category}</p>
              </div>
            ))}

            {/* 残り */}
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 flex items-center justify-center">
              <p className="text-sm text-slate-400 text-center">
                他にも多数
                <br />
                ご用意しています
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
              あなたに合ったプランで
            </h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">
              まず無料でお試しいただけます。
              <br />
              いつでもアップグレード・解約が可能です。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {planHighlights.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 bg-white shadow-sm hover:shadow-md transition-all ${plan.color}`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-white bg-purple-600 rounded-full px-3 py-1">
                    {plan.badge}
                  </span>
                )}
                <h3 className={`font-bold text-lg mb-1 ${plan.headingColor}`}>{plan.name}</h3>
                <p className="text-2xl font-bold text-slate-900 mb-4">{plan.price}</p>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      {f}
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
              料金の詳細を見る
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Download CTA Section ===== */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-purple-950 via-indigo-900 to-purple-800 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <CTACards />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">もうすぐリリース</h2>
          <p className="text-purple-200 text-lg max-w-xl mx-auto mb-10">
            iOS・Androidアプリを準備中です。
            <br />
            リリース時にお知らせを受け取りませんか？
          </p>
          <NotifyForm />
        </div>
      </section>
    </>
  );
}
