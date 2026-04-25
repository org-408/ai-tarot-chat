export const metadata = {
  title: "利用規約 | Ariadne - AI対話リーディング体験",
  description: "Ariadne - AI対話リーディング体験の利用規約",
};

export default function TermsPage() {
  const lastUpdated = "2026年3月20日";
  const appName = "Ariadne - AI対話リーディング体験";
  const developerName = "Atelier Flow Lab";
  const contactEmail = "support@ariadne-ai.app";

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* ヘッダー */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{appName}</h1>
          <p className="text-lg font-semibold text-gray-700 mt-1">利用規約</p>
          <p className="text-sm text-gray-500 mt-2">最終更新日：{lastUpdated}</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          {/* 前文 */}
          <section>
            <p className="text-gray-700">
              本利用規約（以下「本規約」）は、{developerName}
              （以下「当社」）が提供する{appName}
              （以下「本アプリ」）の利用に関する条件を定めるものです。本アプリをご利用になる前に、本規約をよくお読みください。本アプリのインストールまたはご利用をもって、本規約に同意いただいたものとみなします。
            </p>
          </section>

          {/* 第1条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第1条　サービスの概要
            </h2>
            <p className="text-gray-700">
              本アプリは、AIとの対話を通じたタロットカード・リーディング体験サービスを提供します。リーディング結果はAIが生成するものであり、エンターテインメント目的でのご利用を前提としています。プロのタロット占い師による人的サービスではありません。
            </p>
          </section>

          {/* 第2条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第2条　利用資格
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>本アプリは13歳以上の方を対象としています。</li>
              <li>
                13歳未満の方が利用する場合は、保護者の同意が必要です。
              </li>
              <li>
                本規約に同意できない方は、本アプリのご利用をお控えください。
              </li>
            </ul>
          </section>

          {/* 第3条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第3条　アカウント・ゲスト利用
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>
                本アプリはアカウント登録なしでゲストとして利用できます。ただし、一部機能はアカウント登録が必要です。
              </li>
              <li>
                アカウント登録にはGoogle認証またはApple認証を使用します。
              </li>
              <li>
                アカウント情報の管理・セキュリティはお客様の責任においてお願いします。
              </li>
              <li>
                第三者によるアカウントの不正利用が判明した場合は、速やかに当社へご連絡ください。
              </li>
            </ul>
          </section>

          {/* 第4条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第4条　料金・サブスクリプション
            </h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  （1）無料・有料プラン
                </h3>
                <p className="text-gray-600">
                  本アプリは無料のゲストプランおよびFreeプランに加え、有料のStandardプラン・Premiumプランを提供しています。各プランの機能・利用制限はアプリ内に記載の内容に準じます。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  （2）課金・決済
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                  <li>
                    有料プランはApp Store（iOS）またはGoogle
                    Play（Android）を通じて課金されます。
                  </li>
                  <li>課金の管理はRevenueCatを通じて行われます。</li>
                  <li>
                    料金はご利用のストアに表示される金額（税込）となります。
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  （3）サブスクリプションの自動更新
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                  <li>
                    有料プランは契約期間終了の24時間前までに解約しない限り、自動更新されます。
                  </li>
                  <li>
                    解約はApp Store（設定＞サブスクリプション）またはGoogle
                    Play（定期購入の管理）からお手続きください。
                  </li>
                  <li>
                    契約期間の途中での解約の場合、残存期間の返金はApp
                    Store・Google Playのポリシーに準じます。
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  （4）無料トライアル
                </h3>
                <p className="text-gray-600">
                  無料トライアル期間が提供される場合、トライアル終了前に解約しない場合は有料プランに自動移行します。
                </p>
              </div>
            </div>
          </section>

          {/* 第5条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第5条　禁止事項
            </h2>
            <p className="mb-2 text-gray-700">
              お客様は、以下の行為を行ってはなりません。
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>法令または公序良俗に違反する行為</li>
              <li>本アプリのリバースエンジニアリング・改ざん・複製</li>
              <li>本アプリへの不正アクセスまたはサーバーへの過度な負荷</li>
              <li>他のユーザーや第三者の権利を侵害する行為</li>
              <li>スパム、フィッシング、詐欺的行為</li>
              <li>当社が不適切と判断するその他の行為</li>
            </ul>
          </section>

          {/* 第6条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第6条　免責事項
            </h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  （1）リーディング結果について
                </h3>
                <p className="text-gray-600">
                  本アプリのリーディング結果はAIが生成するエンターテインメントコンテンツです。リーディング結果の正確性・的中率を保証するものではなく、医療・法律・財務などの専門的アドバイスの代替として利用しないでください。リーディング結果に基づいた判断・行動はお客様自身の責任において行ってください。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  （2）サービスの継続性
                </h3>
                <p className="text-gray-600">
                  当社は、メンテナンス・システム障害・天災その他の事由により、予告なくサービスを一時停止または終了する場合があります。これにより生じた損害について、当社は一切責任を負いません。
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  （3）損害賠償の制限
                </h3>
                <p className="text-gray-600">
                  当社の責に帰すべき事由によりお客様に損害が生じた場合、当社の賠償責任は、お客様が過去1ヶ月間に当社に支払った金額を上限とします。
                </p>
              </div>
            </div>
          </section>

          {/* 第7条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第7条　知的財産権
            </h2>
            <p className="text-gray-700">
              本アプリに含まれるすべてのコンテンツ（テキスト・画像・デザイン・プログラムを含む）の知的財産権は当社または正当な権利者に帰属します。本規約で明示的に許可された範囲を超えての使用・複製・配布を禁止します。
            </p>
          </section>

          {/* 第8条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第8条　規約の変更
            </h2>
            <p className="text-gray-700">
              当社は、必要に応じて本規約を変更することがあります。変更後の規約は本ページに掲載した時点から効力を生じます。変更後もご利用を継続された場合は、変更後の規約に同意いただいたものとみなします。
            </p>
          </section>

          {/* 第9条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第9条　準拠法・管轄裁判所
            </h2>
            <p className="text-gray-700">
              本規約は日本法に準拠し、解釈されます。本規約に関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </section>

          {/* 第10条 */}
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第10条　お問い合わせ
            </h2>
            <p className="text-gray-700 mb-2">
              本規約に関するご質問・苦情等は以下にご連絡ください。
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
