import type { Metadata } from "next";
import { TrackedLink } from "@/components/analytics/tracked-link";

export const metadata: Metadata = {
  title: "ダウンロード",
  description:
    "AI タロット占いをダウンロードしよう。iOS（App Store）・Android（Google Play）対応。Webブラウザでもご利用いただけます。",
};

const platforms = [
  {
    icon: "",
    name: "iOS (iPhone / iPad)",
    store: "App Store",
    description: "iOS 16以降対応。iPhone・iPadでご利用いただけます。",
    badge: "近日公開",
    badgeStyle: "bg-slate-100 text-slate-500",
    buttonStyle:
      "bg-black text-white hover:bg-slate-800 cursor-not-allowed opacity-70",
    disabled: true,
  },
  {
    icon: "🤖",
    name: "Android",
    store: "Google Play",
    description: "Android 8.0以降対応。スマートフォン・タブレットでご利用いただけます。",
    badge: "近日公開",
    badgeStyle: "bg-slate-100 text-slate-500",
    buttonStyle:
      "bg-green-600 text-white hover:bg-green-700 cursor-not-allowed opacity-70",
    disabled: true,
  },
  {
    icon: "🌐",
    name: "Web ブラウザ",
    store: null,
    description:
      "インストール不要。Safari・Chrome・Firefoxなど主要ブラウザで今すぐご利用いただけます。",
    badge: "今すぐ利用可能",
    badgeStyle: "bg-green-100 text-green-700",
    buttonStyle: "bg-purple-700 text-white hover:bg-purple-800",
    href: "/auth/signin",
    disabled: false,
  },
];

const steps = [
  {
    step: "1",
    title: "アプリを入手",
    description: "App Store または Google Play からダウンロード（またはWebブラウザでアクセス）。",
  },
  {
    step: "2",
    title: "すぐに占いを開始",
    description: "登録不要のゲストプランで、今すぐタロット占いを体験できます。",
  },
  {
    step: "3",
    title: "占い師を選ぶ",
    description: "8人の個性豊かなAI占い師の中から、今日の気分に合った一人を選んで。",
  },
  {
    step: "4",
    title: "カードを引く",
    description: "心を落ち着けてカードをタップ。AIがあなたの状況を深く読み解きます。",
  },
];

const requirements = [
  { platform: "iOS", requirement: "iOS 16.0 以降 / iPhone・iPad対応" },
  { platform: "Android", requirement: "Android 8.0 (Oreo) 以降" },
  { platform: "Web", requirement: "最新のChrome・Safari・Firefox・Edge" },
];

export default function DownloadPage() {
  return (
    <>
      {/* ===== ヘッダー ===== */}
      <section className="bg-gradient-to-br from-purple-950 via-indigo-900 to-purple-800 text-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-5xl mb-6">📱</div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">
            AI タロット占いを始めよう
          </h1>
          <p className="text-purple-200 text-lg max-w-xl mx-auto">
            iOS・Android・Webブラウザで利用できます。
            <br />
            登録不要で、今すぐ無料でお試しいただけます。
          </p>
        </div>
      </section>

      {/* ===== プラットフォーム ===== */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-12">
            対応プラットフォーム
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {platforms.map((p) => (
              <div
                key={p.name}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-8 flex flex-col items-center text-center hover:border-purple-200 hover:bg-purple-50/20 transition-all"
              >
                {/* アイコン */}
                <div className="text-5xl mb-4">{p.icon}</div>

                {/* バッジ */}
                <span
                  className={`text-xs font-semibold rounded-full px-3 py-1 mb-4 ${p.badgeStyle}`}
                >
                  {p.badge}
                </span>

                <h3 className="text-xl font-bold text-slate-900 mb-1">{p.name}</h3>
                {p.store && (
                  <p className="text-sm text-slate-500 mb-3">{p.store}</p>
                )}
                <p className="text-sm text-slate-600 leading-relaxed mb-8">
                  {p.description}
                </p>

                {/* ボタン */}
                {p.disabled ? (
                  <button
                    disabled
                    className={`w-full rounded-xl py-3.5 text-base font-semibold transition-all ${p.buttonStyle}`}
                  >
                    {p.store ? `${p.store} からダウンロード` : "ブラウザで開く"}
                  </button>
                ) : (
                  <TrackedLink
                    href={`${p.href!}?from=download`}
                    pageName="download"
                    placement="platform_card"
                    ctaName="open_web"
                    className={`w-full rounded-xl py-3.5 text-base font-semibold text-center transition-all ${p.buttonStyle}`}
                  >
                    ブラウザで今すぐ開く →
                  </TrackedLink>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-slate-400 mt-6">
            ※ iOS・Androidアプリは現在準備中です。リリース時にお知らせします。
          </p>
        </div>
      </section>

      {/* ===== 使い方ステップ ===== */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-slate-50 to-purple-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-12">
            かんたん4ステップ
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center">
                {/* ステップ番号 */}
                <div className="w-14 h-14 rounded-2xl bg-purple-700 text-white text-2xl font-bold flex items-center justify-center mb-4 shadow-md">
                  {s.step}
                </div>

                {/* 矢印（最後以外） */}
                <h3 className="font-bold text-slate-900 text-base mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 動作環境 ===== */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-12">
            動作環境
          </h2>

          <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left p-4 text-slate-500 font-medium">プラットフォーム</th>
                  <th className="text-left p-4 text-slate-500 font-medium">必要環境</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((r, i) => (
                  <tr
                    key={r.platform}
                    className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  >
                    <td className="p-4 font-semibold text-slate-800">{r.platform}</td>
                    <td className="p-4 text-slate-600">{r.requirement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-16 bg-gradient-to-br from-purple-950 via-indigo-900 to-purple-800 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            まずWebで試してみよう
          </h2>
          <p className="text-purple-200 mb-8">
            インストール不要。ブラウザで今すぐ体験できます。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <TrackedLink
              href="/auth/signin?from=download"
              pageName="download"
              placement="final_cta"
              ctaName="start_web"
              className="inline-flex items-center gap-2 rounded-full bg-white text-purple-900 px-8 py-3.5 text-base font-semibold shadow-lg hover:bg-purple-50 transition-all hover:scale-105"
            >
              <span>🌐</span>
              Webで今すぐ始める
            </TrackedLink>
            <TrackedLink
              href="/pricing"
              pageName="download"
              placement="final_cta"
              ctaName="view_pricing"
              className="inline-flex items-center gap-2 rounded-full border border-purple-400/50 text-white px-8 py-3.5 text-base font-semibold hover:bg-purple-500/20 transition-all"
            >
              料金プランを確認する
            </TrackedLink>
          </div>
        </div>
      </section>
    </>
  );
}
