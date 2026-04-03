import { TrackedLink } from "@/components/analytics/tracked-link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "料金プラン",
  description:
    "AI タロット占いの料金プラン一覧。無料のゲストプランから本格的なプレミアムプランまで。いつでも解約可能。",
};

type Plan = {
  code: string;
  name: string;
  price: string;
  priceNote?: string;
  description: string;
  color: string;
  borderColor: string;
  headingColor: string;
  badge?: string;
  badgeColor?: string;
  requiresAuth: boolean;
  features: string[];
  tarotists: string[];
  spreads: string;
  maxReadings: string;
  hasHistory: boolean;
  hasPersonal: boolean;
  hasAds: boolean;
  cta: string;
  ctaStyle: string;
};

const plans: Plan[] = [
  {
    code: "GUEST",
    name: "ゲスト",
    price: "無料",
    description: "登録不要で今すぐお試し。",
    color: "bg-white",
    borderColor: "border-slate-200",
    headingColor: "text-slate-700",
    requiresAuth: false,
    features: [
      "ユーザー登録不要",
      "1日1回まで利用可能",
      "基本スプレッド3種類",
      "恋愛・仕事・今日の運勢",
      "広告表示あり",
    ],
    tarotists: ["🌸 Lily", "📚 Clara（オフライン）"],
    spreads: "3種類（基本）",
    maxReadings: "1日1回",
    hasHistory: false,
    hasPersonal: false,
    hasAds: true,
    cta: "今すぐ試す",
    ctaStyle:
      "border-2 border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50",
  },
  {
    code: "FREE",
    name: "フリー",
    price: "無料",
    description: "登録するだけで回数が増え、履歴も残せる。",
    color: "bg-green-50",
    borderColor: "border-green-200",
    headingColor: "text-green-700",
    requiresAuth: true,
    features: [
      "Google / Appleアカウントで登録",
      "1日3回まで利用可能",
      "基本スプレッド3種類",
      "占い履歴を保存可能",
      "広告表示あり",
    ],
    tarotists: ["🌸 Lily", "🌙 Luna", "📚 Clara（オフライン）"],
    spreads: "3種類（基本）",
    maxReadings: "1日3回",
    hasHistory: true,
    hasPersonal: false,
    hasAds: true,
    cta: "無料で登録",
    ctaStyle:
      "border-2 border-green-500 text-green-700 hover:bg-green-500 hover:text-white",
  },
  {
    code: "STANDARD",
    name: "スタンダード",
    price: "¥480",
    priceNote: "/ 月",
    description: "多彩なスプレッドと占い師で本格体験。広告なし。",
    color: "bg-blue-50",
    borderColor: "border-blue-300",
    headingColor: "text-blue-700",
    badge: "人気",
    badgeColor: "bg-blue-600",
    requiresAuth: true,
    features: [
      "1日3回まで利用可能",
      "ケルト十字を含む全22種のスプレッド",
      "全カテゴリ・多彩なスプレッド",
      "占い履歴を保存可能",
      "広告なし",
    ],
    tarotists: ["🌸 Lily", "🌙 Luna", "⭐ Stella", "🔮 Celine", "📚 Clara"],
    spreads: "22種類（ケルト十字含む）",
    maxReadings: "1日3回",
    hasHistory: true,
    hasPersonal: false,
    hasAds: false,
    cta: "スタンダードで始める",
    ctaStyle: "bg-blue-600 text-white hover:bg-blue-700",
  },
  {
    code: "PREMIUM",
    name: "プレミアム",
    price: "¥980",
    priceNote: "/ 月",
    description: "全機能解放。AI対話で深いリーディングを。",
    color: "bg-yellow-50",
    borderColor: "border-yellow-300",
    headingColor: "text-yellow-700",
    badge: "おすすめ",
    badgeColor: "bg-purple-600",
    requiresAuth: true,
    features: [
      "1日3回すべてのスプレッドが利用可能",
      "1日1回パーソナル占い",
      "占う内容の入力・AIへの質問が可能",
      "全カテゴリ・全スプレッド",
      "占い履歴を保存可能",
      "広告なし",
    ],
    tarotists: [
      "🌸 Lily",
      "🌙 Luna",
      "⭐ Stella",
      "🔮 Celine",
      "✨ Gloria",
      "💎 Sophia",
      "👸 Ariadne",
      "📚 Clara",
    ],
    spreads: "24種類（全スプレッド）",
    maxReadings: "1日3回",
    hasHistory: true,
    hasPersonal: true,
    hasAds: false,
    cta: "プレミアムで始める",
    ctaStyle: "bg-purple-700 text-white hover:bg-purple-800",
  },
];

const comparisonRows = [
  { label: "月額料金", values: ["無料", "無料", "¥480", "¥980"] },
  { label: "ユーザー登録", values: ["不要", "必要", "必要", "必要"] },
  { label: "1日の利用回数", values: ["1回", "3回", "3回", "3回"] },
  { label: "スプレッド数", values: ["3種", "3種", "22種", "24種"] },
  { label: "パーソナル占い", values: ["×", "×", "×", "1日1回"] },
  { label: "AI対話（質問）", values: ["×", "×", "×", "○"] },
  { label: "占い履歴", values: ["×", "○", "○", "○"] },
  { label: "広告", values: ["あり", "あり", "なし", "なし"] },
  {
    label: "利用できる占い師",
    values: ["2人", "3人", "5人", "8人全員"],
  },
];

export default function PricingPage() {
  return (
    <>
      {/* ===== ヘッダー ===== */}
      <section className="bg-gradient-to-br from-purple-950 via-indigo-900 to-purple-800 text-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">料金プラン</h1>
          <p className="text-purple-200 text-lg max-w-xl mx-auto">
            まず無料でお試しください。
            <br />
            プランはいつでも変更・解約できます。
          </p>
        </div>
      </section>

      {/* ===== プランカード ===== */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.code}
                className={`relative rounded-2xl border-2 ${plan.borderColor} ${plan.color} p-6 flex flex-col shadow-sm hover:shadow-md transition-all`}
              >
                {/* バッジ */}
                {plan.badge && (
                  <span
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-white ${plan.badgeColor} rounded-full px-3 py-1`}
                  >
                    {plan.badge}
                  </span>
                )}

                {/* プラン名・価格 */}
                <div className="mb-5">
                  <h2 className={`text-xl font-bold mb-1 ${plan.headingColor}`}>
                    {plan.name}
                  </h2>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-3xl font-bold text-slate-900">
                      {plan.price}
                    </span>
                    {plan.priceNote && (
                      <span className="text-slate-500 text-sm mb-1">
                        {plan.priceNote}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">{plan.description}</p>
                </div>

                {/* 機能リスト */}
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-slate-700"
                    >
                      <span className="text-green-500 flex-shrink-0 mt-0.5">
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* 占い師一覧 */}
                <div className="mb-5 p-3 bg-white/60 rounded-xl">
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    利用できる占い師
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {plan.tarotists.map((t) => (
                      <span
                        key={t}
                        className="text-xs bg-white border border-slate-200 rounded-full px-2 py-0.5 text-slate-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <TrackedLink
                  href="/download"
                  pageName="pricing"
                  placement="plan_card"
                  ctaName="select_plan"
                  planCode={plan.code}
                  className={`w-full rounded-full py-3 text-center text-sm font-semibold transition-all ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </TrackedLink>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 比較表 ===== */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-12">
            プラン比較表
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left p-4 text-slate-500 font-medium w-40">
                    機能
                  </th>
                  {plans.map((p) => (
                    <th
                      key={p.code}
                      className="p-4 text-center font-bold text-slate-800"
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  >
                    <td className="p-4 text-slate-600 font-medium">
                      {row.label}
                    </td>
                    {row.values.map((v, j) => (
                      <td key={j} className="p-4 text-center text-slate-700">
                        {v === "○" ? (
                          <span className="text-green-500 text-lg font-bold">
                            ✓
                          </span>
                        ) : v === "×" ? (
                          <span className="text-slate-300 text-lg">—</span>
                        ) : (
                          v
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-12">
            よくある質問
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "無料プランでどのくらい使えますか？",
                a: "ゲストプランは登録不要で1日1回、フリープランは登録後1日3回ご利用いただけます。どちらも基本的なスプレッド3種類を無料でお試しいただけます。",
              },
              {
                q: "有料プランはいつでも解約できますか？",
                a: "はい、いつでも解約可能です。解約後は次の更新日までプランをご利用いただけます。",
              },
              {
                q: "プランを途中でアップグレードできますか？",
                a: "はい、いつでもアップグレードできます。変更はアプリ内のプランページから行えます。",
              },
              {
                q: "オフラインでも使えますか？",
                a: "見習い占い師のClara（📚）はオフラインでも利用可能です。インターネット接続がない環境でも基本的な占いをお楽しみいただけます。",
              },
              {
                q: "データはデバイス間で同期されますか？",
                a: "ユーザー登録（フリープラン以上）をいただくと、複数のデバイス間で占い履歴が同期されます。",
              },
            ].map((faq) => (
              <div
                key={faq.q}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-6"
              >
                <h3 className="font-bold text-slate-900 mb-2">Q. {faq.q}</h3>
                <p className="text-slate-600 leading-relaxed">A. {faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Bottom CTA ===== */}
      <section className="py-16 bg-gradient-to-br from-purple-950 via-indigo-900 to-purple-800 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            まず無料で試してみよう
          </h2>
          <p className="text-purple-200 mb-8">
            クレジットカード不要。登録なしでもすぐに始められます。
          </p>
          <TrackedLink
            href="/download"
            pageName="pricing"
            placement="final_cta"
            ctaName="download_app"
            className="inline-flex items-center gap-2 rounded-full bg-white text-purple-900 px-8 py-3.5 text-base font-semibold shadow-lg hover:bg-purple-50 transition-all hover:scale-105"
          >
            <span>📱</span>
            アプリをダウンロード
          </TrackedLink>
        </div>
      </section>
    </>
  );
}
