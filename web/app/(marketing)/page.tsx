import type { Metadata } from "next";
import { TrackedLink } from "@/components/analytics/tracked-link";
import Link from "next/link";
import { tarotistService } from "@/lib/server/services";
import type { Tarotist } from "@/../shared/lib/types";
import { TarotistsSection } from "@/components/marketing/tarotists-section";

export const metadata: Metadata = {
  title: "AI タロット占い — AIが読み解くあなたの未来",
  description:
    "8人の個性豊かなAI占い師と24種以上のスプレッドで、本格的なタロットリーディングを体験しよう。iOS・Android・Web対応。無料プランあり。",
};

const features = [
  {
    icon: "🧙‍♀️",
    title: "8人の個性豊かなAI占い師",
    description:
      "元気な駆け出し占い師から、最高峰の至高の占い師まで。あなたの気分や悩みに合ったキャラクターを選べます。",
  },
  {
    icon: "🃏",
    title: "24種以上のスプレッド",
    description:
      "ワンカードから10枚のケルト十字、12ヶ月のイヤースプレッドまで。恋愛・仕事・金運など幅広いテーマに対応。",
  },
  {
    icon: "💬",
    title: "対話型リーディング",
    description:
      "占い結果に疑問があればその場で質問できます（プレミアム）。AIがあなたの状況を深く理解して寄り添います。",
  },
  {
    icon: "📱",
    title: "マルチプラットフォーム対応",
    description:
      "iOS・Androidアプリ、Webブラウザ、いつでもどこでも占いを楽しめます。データは同期されます。",
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
    features: ["1日3回", "7枚以内全スプレッド", "ケルト十字（1日1回）", "広告なし"],
  },
  {
    name: "プレミアム",
    price: "¥980/月",
    color: "bg-yellow-50 border-yellow-200",
    headingColor: "text-yellow-700",
    badge: "おすすめ",
    features: ["1日3回", "全スプレッド", "パーソナル占い", "AI対話", "広告なし"],
  },
];


export default async function LandingPage() {
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
              個性豊かな8人のAI占い師と、24種以上のスプレッドで
              <br className="hidden sm:block" />
              本格的なタロットリーディングを体験しよう。
            </p>

            {/* CTAボタン */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <TrackedLink
                href="/download"
                pageName="landing"
                placement="hero"
                ctaName="download_app"
                className="inline-flex items-center gap-2 rounded-full bg-white text-purple-900 px-8 py-3.5 text-base font-semibold shadow-lg hover:bg-purple-50 transition-all hover:scale-105"
              >
                <span>📱</span>
                アプリをダウンロード
              </TrackedLink>
              <Link
                href="/#features"
                className="inline-flex items-center gap-2 rounded-full border border-purple-400/50 text-white px-8 py-3.5 text-base font-semibold hover:bg-purple-500/20 transition-all"
              >
                詳しく見る
                <span>↓</span>
              </Link>
            </div>

            {/* 無料バッジ */}
            <p className="mt-6 text-sm text-purple-300">
              ゲストプランは無料・登録不要でご利用いただけます
            </p>
          </div>

          {/* タロットカードの装飾 */}
          <div className="mt-16 flex justify-center gap-4 sm:gap-6">
            {["🌙", "⭐", "🔮", "✨", "👸"].map((icon, i) => (
              <div
                key={i}
                className="relative w-16 h-24 sm:w-20 sm:h-32 rounded-xl bg-gradient-to-br from-purple-600/40 to-indigo-700/40 border border-purple-400/30 flex items-center justify-center text-2xl sm:text-3xl shadow-xl backdrop-blur-sm"
                style={{
                  transform: `rotate(${(i - 2) * 5}deg) translateY(${Math.abs(i - 2) * 4}px)`,
                }}
              >
                {icon}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Features Section ===== */}
      <section id="features" className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              なぜ AI タロット占いなのか
            </h2>
            <p className="text-slate-600 text-lg max-w-xl mx-auto">
              最先端のAIと伝統のタロットが融合した、まったく新しい占い体験。
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
              24種以上のスプレッド
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
              href="/pricing"
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
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-5xl mb-6">🔮</div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            今すぐ占いを始めよう
          </h2>
          <p className="text-purple-200 text-lg max-w-xl mx-auto mb-10">
            登録不要で、今すぐ無料でお試しいただけます。
            <br />
            iOS・Android・Webブラウザに対応しています。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <TrackedLink
              href="/download"
              pageName="landing"
              placement="final_cta"
              ctaName="app_store"
              className="inline-flex items-center gap-3 rounded-2xl bg-white text-purple-900 px-7 py-4 text-base font-semibold shadow-lg hover:bg-purple-50 transition-all hover:scale-105 min-w-[200px] justify-center"
            >
              <span className="text-2xl"></span>
              <span>App Store</span>
            </TrackedLink>
            <TrackedLink
              href="/download"
              pageName="landing"
              placement="final_cta"
              ctaName="google_play"
              className="inline-flex items-center gap-3 rounded-2xl bg-white/20 border border-white/30 text-white px-7 py-4 text-base font-semibold transition-all hover:bg-white/30 min-w-[200px] justify-center"
            >
              <span className="text-2xl">🤖</span>
              <span>Google Play <span className="text-xs opacity-70">（準備中）</span></span>
            </TrackedLink>
          </div>

          <p className="mt-6 text-sm text-purple-300">
            または{" "}
            <TrackedLink
              href="/auth/signin?from=landing"
              pageName="landing"
              placement="final_cta"
              ctaName="web_signin"
              className="underline hover:text-white transition-colors"
            >
              Web版でブラウザから利用する
            </TrackedLink>
          </p>
        </div>
      </section>
    </>
  );
}
