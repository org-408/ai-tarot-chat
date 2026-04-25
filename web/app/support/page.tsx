import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "サポート | Ariadne - AI対話リーディング体験",
  description: "Ariadne のサポート・よくある質問・お問い合わせ",
};

const faqs = [
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
    a: "見習いAI占い師のClara（📚）はオフラインでも利用可能です。インターネット接続がない環境でも基本的なリーディングをお楽しみいただけます。",
  },
  {
    q: "データはデバイス間で同期されますか？",
    a: "ユーザー登録（フリープラン以上）をいただくと、複数のデバイス間でリーディング履歴が同期されます。",
  },
];

export default function SupportPage() {
  const developerName = "Atelier Flow Lab";
  const contactEmail = "support@ariadne-ai.app";
  const appName = "Ariadne - AI対話リーディング体験";

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* ヘッダー */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{appName}</h1>
          <p className="text-lg font-semibold text-gray-700 mt-1">サポート</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          {/* 前文 */}
          <section>
            <p className="text-gray-700">
              {appName} のご利用に関するよくある質問とお問い合わせ先をご案内します。
            </p>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              よくある質問
            </h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.q}>
                  <h3 className="font-semibold text-gray-800 mb-1">Q. {faq.q}</h3>
                  <p className="text-gray-600">A. {faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* お問い合わせ */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              お問い合わせ
            </h2>
            <p className="text-gray-700 mb-2">
              FAQ で解決しないご質問・ご要望は以下のメールアドレスまでご連絡ください。
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-700 space-y-1">
              <p>
                <span className="font-semibold">事業者名：</span>
                {developerName}
              </p>
              <p>
                <span className="font-semibold">メール：</span>
                <a
                  href={`mailto:${contactEmail}?subject=Ariadne%20サポートお問い合わせ`}
                  className="text-purple-600 underline ml-1"
                >
                  {contactEmail}
                </a>
              </p>
            </div>
          </section>

          {/* 法的情報 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              法的情報
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>
                <Link href="/privacy" className="text-purple-600 underline">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-purple-600 underline">
                  利用規約
                </Link>
              </li>
              <li>
                <Link href="/delete-account" className="text-purple-600 underline">
                  アカウント削除について
                </Link>
              </li>
            </ul>
          </section>

          {/* フッター */}
          <div className="pt-4 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} {developerName}. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
