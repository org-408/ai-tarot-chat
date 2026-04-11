export const metadata = {
  title: "アカウント削除 | AI タロット占い",
  description: "AI タロット占いアプリのアカウント削除について",
};

export default function DeleteAccountPage() {
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
            アカウント削除
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          {/* 案内 */}
          <section>
            <p className="text-gray-700">
              アカウントの削除をご希望の場合は、以下のメールアドレスまでご連絡ください。お名前（またはご登録のメールアドレス）を添えてお送りいただければ、通常 7 営業日以内に対応いたします。
            </p>
          </section>

          {/* 連絡先 */}
          <section>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-700 space-y-1">
              <p>
                <span className="font-semibold">事業者名：</span>
                {developerName}
              </p>
              <p>
                <span className="font-semibold">メール：</span>
                <a
                  href={`mailto:${contactEmail}?subject=アカウント削除依頼`}
                  className="text-purple-600 underline ml-1"
                >
                  {contactEmail}
                </a>
              </p>
            </div>
          </section>

          {/* 削除されるデータ */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              削除されるデータ
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>アカウント情報（メールアドレス、表示名、プロフィール画像）</li>
              <li>タロット占いの履歴・チャット履歴</li>
              <li>お気に入りスプレッドの登録情報</li>
              <li>利用状況データ</li>
            </ul>
            <p className="mt-3 text-gray-500 text-xs">
              ※ 削除後の復元はできません。
            </p>
          </section>

          {/* サブスクリプションの注意 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              サブスクリプションについて
            </h2>
            <p className="text-gray-700">
              アカウント削除によってサブスクリプションは自動的に解約されません。有料プランをご利用中の場合は、App Store（iOS）または Google Play（Android）にて別途解約手続きをお願いします。
            </p>
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
