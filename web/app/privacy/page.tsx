export const metadata = {
  title: "プライバシーポリシー | AI タロット占い",
  description: "AI タロット占いアプリのプライバシーポリシー",
};

export default function PrivacyPage() {
  const lastUpdated = "2026年3月20日";
  const appName = "AI タロット占い";
  const developerName = "Atelier Flow Lab";
  const contactEmail = "support@ariadne-ai.app";

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* ヘッダー */}
        <div className="mb-8 text-center">
          <div className="text-4xl mb-3">🔮</div>
          <h1 className="text-2xl font-bold text-gray-900">{appName}</h1>
          <p className="text-lg font-semibold text-gray-700 mt-1">
            プライバシーポリシー
          </p>
          <p className="text-sm text-gray-500 mt-2">最終更新日：{lastUpdated}</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          {/* 前文 */}
          <section>
            <p className="text-gray-700">
              {developerName}（以下「当社」）は、{appName}
              （以下「本アプリ」）をご利用いただくにあたり、お客様の個人情報の取り扱いについて以下のとおり定めます。
            </p>
          </section>

          {/* 第1条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第1条　収集する情報
            </h2>
            <p className="mb-2 text-gray-700">
              本アプリは、サービス提供のために以下の情報を収集する場合があります。
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  （1）自動的に収集される情報
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                  <li>デバイス識別子（端末固有のID）</li>
                  <li>OS種別・バージョン、アプリバージョン</li>
                  <li>本アプリの利用状況（占い実施回数、利用プランなど）</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  （2）お客様がご提供される情報
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                  <li>
                    ソーシャルログイン（Google・Apple）利用時：メールアドレス、表示名、プロフィール画像URL
                  </li>
                  <li>占いに入力した相談内容・質問文</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 第2条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第2条　情報の利用目的
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>本アプリのサービス提供および機能改善</li>
              <li>ユーザーアカウントの識別・管理</li>
              <li>サブスクリプション（課金）の管理</li>
              <li>AIによるタロット占い結果の生成</li>
              <li>利用状況の分析およびサービス品質向上</li>
              <li>お問い合わせへの対応</li>
            </ul>
          </section>

          {/* 第3条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第3条　第三者への情報提供
            </h2>
            <p className="mb-3 text-gray-700">
              当社は、以下の場合を除き、収集した情報を第三者に提供しません。
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2 mb-4">
              <li>お客様の同意がある場合</li>
              <li>法令に基づく開示が必要な場合</li>
              <li>人命・財産の保護のために必要な場合</li>
            </ul>
            <p className="mb-2 text-gray-700">
              また、本アプリはサービス提供のために以下の外部サービスを利用しており、それぞれのプライバシーポリシーに従い情報が処理される場合があります。
            </p>
            <ul className="space-y-2 ml-2">
              {[
                {
                  name: "RevenueCat",
                  url: "https://www.revenuecat.com/privacy",
                  desc: "サブスクリプション管理",
                },
                {
                  name: "Google Gemini API",
                  url: "https://policies.google.com/privacy",
                  desc: "AI占い結果の生成",
                },
                {
                  name: "Groq",
                  url: "https://groq.com/privacy-policy",
                  desc: "AI占い結果の生成",
                },
                {
                  name: "Google Sign-In",
                  url: "https://policies.google.com/privacy",
                  desc: "ソーシャルログイン（任意）",
                },
                {
                  name: "Sign in with Apple",
                  url: "https://www.apple.com/legal/privacy/",
                  desc: "ソーシャルログイン（任意）",
                },
              ].map((s) => (
                <li key={s.name} className="flex items-start gap-1 text-gray-600">
                  <span className="text-purple-400 mt-0.5">▸</span>
                  <span>
                    <strong>{s.name}</strong>（{s.desc}）：
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 underline ml-1"
                    >
                      プライバシーポリシーを見る
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* 第4条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第4条　データの保管・管理
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>収集した情報は、暗号化通信（HTTPS）を通じて送受信されます。</li>
              <li>
                サービス運営に必要な期間、安全に管理されたサーバーに保存されます。
              </li>
              <li>不要になったデータは適切な方法で削除します。</li>
              <li>
                ゲストとしてのご利用では、デバイス識別子のみを使用し、個人を特定する情報は収集しません。
              </li>
            </ul>
          </section>

          {/* 第5条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第5条　お客様の権利
            </h2>
            <p className="mb-2 text-gray-700">
              お客様は、ご自身の個人情報について以下の権利を有します。
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>開示・確認を求める権利</li>
              <li>訂正・削除を求める権利</li>
              <li>利用停止を求める権利</li>
            </ul>
            <p className="mt-2 text-gray-700">
              これらのご要望は、下記お問い合わせ先までご連絡ください。
            </p>
          </section>

          {/* 第6条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第6条　お子様のプライバシー
            </h2>
            <p className="text-gray-700">
              本アプリは13歳未満の方を対象としておらず、意図的に13歳未満の個人情報を収集することはありません。13歳未満のお子様の情報が収集されたと判明した場合は、速やかに削除します。
            </p>
          </section>

          {/* 第7条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第7条　本ポリシーの変更
            </h2>
            <p className="text-gray-700">
              当社は、必要に応じて本ポリシーを改定することがあります。重要な変更がある場合は、アプリ内または本ページにてお知らせします。変更後もご利用を継続された場合は、改定後のポリシーに同意いただいたものとみなします。
            </p>
          </section>

          {/* 第8条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第8条　お問い合わせ
            </h2>
            <p className="text-gray-700 mb-2">
              本ポリシーに関するご質問・ご要望は以下にご連絡ください。
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-700 space-y-1">
              <p>
                <span className="font-semibold">事業者名：</span>
                {developerName}
              </p>
              <p>
                <span className="font-semibold">メール：</span>
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-purple-600 underline"
                >
                  {contactEmail}
                </a>
              </p>
            </div>
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
