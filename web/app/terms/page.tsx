import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { resolveLocale, type Locale } from "@/lib/utils/resolve-locale";

type SearchParams = { lang?: string };

async function getLocale(searchParams: Promise<SearchParams>): Promise<Locale> {
  const sp = await searchParams;
  const c = await cookies();
  const h = await headers();
  return resolveLocale(sp, c.get("NEXT_LOCALE")?.value, h.get("accept-language"));
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const locale = await getLocale(searchParams);
  const baseUrl = process.env.AUTH_URL ?? "https://ariadne-ai.app";
  return locale === "en"
    ? {
        title: "Terms of Service | Ariadne: AI Reflection Dialogue",
        description:
          "Terms of Service for Ariadne: AI Reflection Dialogue, an AI-facilitated tarot reflection dialogue experience.",
        alternates: {
          canonical: `${baseUrl}/terms?lang=en`,
          languages: {
            ja: `${baseUrl}/terms`,
            en: `${baseUrl}/terms?lang=en`,
            "x-default": `${baseUrl}/terms`,
          },
        },
      }
    : {
        title: "利用規約 | Ariadne - AI対話リーディング体験",
        description: "Ariadne - AI対話リーディング体験の利用規約",
        alternates: {
          canonical: `${baseUrl}/terms`,
          languages: {
            ja: `${baseUrl}/terms`,
            en: `${baseUrl}/terms?lang=en`,
            "x-default": `${baseUrl}/terms`,
          },
        },
      };
}

const APP_NAME_JA = "Ariadne - AI対話リーディング体験";
const APP_NAME_EN = "Ariadne: AI Reflection Dialogue";
const DEVELOPER_NAME = "Atelier Flow Lab";
const CONTACT_EMAIL = "support@ariadne-ai.app";
const LAST_UPDATED_JA = "2026年3月20日";
const LAST_UPDATED_EN = "March 20, 2026";

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const locale = await getLocale(searchParams);
  return locale === "en" ? <TermsEN /> : <TermsJA />;
}

function TermsJA() {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{APP_NAME_JA}</h1>
          <p className="text-lg font-semibold text-gray-700 mt-1">利用規約</p>
          <p className="text-sm text-gray-500 mt-2">
            最終更新日：{LAST_UPDATED_JA}
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <p className="text-gray-700">
              本利用規約（以下「本規約」）は、{DEVELOPER_NAME}
              （以下「当社」）が提供する{APP_NAME_JA}
              （以下「本アプリ」）の利用に関する条件を定めるものです。本アプリをご利用になる前に、本規約をよくお読みください。本アプリのインストールまたはご利用をもって、本規約に同意いただいたものとみなします。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第1条　サービスの概要
            </h2>
            <p className="text-gray-700">
              本アプリは、AIとの対話を通じたタロットカード・リーディング体験サービスを提供します。リーディング結果はAIが生成するものであり、エンターテインメント目的でのご利用を前提としています。プロのタロット占い師による人的サービスではありません。
            </p>
          </section>

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

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第7条　知的財産権
            </h2>
            <p className="text-gray-700">
              本アプリに含まれるすべてのコンテンツ（テキスト・画像・デザイン・プログラムを含む）の知的財産権は当社または正当な権利者に帰属します。本規約で明示的に許可された範囲を超えての使用・複製・配布を禁止します。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第8条　規約の変更
            </h2>
            <p className="text-gray-700">
              当社は、必要に応じて本規約を変更することがあります。変更後の規約は本ページに掲載した時点から効力を生じます。変更後もご利用を継続された場合は、変更後の規約に同意いただいたものとみなします。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第9条　準拠法・管轄裁判所
            </h2>
            <p className="text-gray-700">
              本規約は日本法に準拠し、解釈されます。本規約に関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </section>

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
                {DEVELOPER_NAME}
              </p>
              <p>
                <span className="font-semibold">メール：</span>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-purple-600 underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </section>

          <div className="pt-4 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} {DEVELOPER_NAME}. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}

function TermsEN() {
  return (
    <div className="min-h-screen bg-white text-gray-800">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{APP_NAME_EN}</h1>
          <p className="text-lg font-semibold text-gray-700 mt-1">
            Terms of Service
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: {LAST_UPDATED_EN}
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <p className="text-gray-700">
              These Terms of Service ("the Terms") set forth the conditions of
              use for {APP_NAME_EN} ("the App"), provided by {DEVELOPER_NAME}{" "}
              ("the Company"). Please read these Terms carefully before using
              the App. By installing or using the App, you are deemed to have
              agreed to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 1. Service Overview
            </h2>
            <p className="text-gray-700">
              The App provides an AI-facilitated tarot reflection dialogue
              experience. Reading responses are generated by AI and are intended
              for entertainment purposes only. The App is not a service provided
              by professional human tarot readers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 2. Eligibility
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>The App is intended for users aged 13 or older.</li>
              <li>
                Users under 13 require the consent of a parent or guardian.
              </li>
              <li>
                If you cannot agree to these Terms, please refrain from using
                the App.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 3. Account and Guest Use
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>
                The App can be used as a guest without account registration.
                Some features, however, require account registration.
              </li>
              <li>
                Account registration uses Google authentication or Apple
                authentication.
              </li>
              <li>
                The management and security of account information are the
                user's responsibility.
              </li>
              <li>
                Please contact us promptly if you discover unauthorized use of
                your account by a third party.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 4. Pricing and Subscriptions
            </h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  (1) Free and Paid Plans
                </h3>
                <p className="text-gray-600">
                  The App offers a free Guest plan and a free plan, in addition
                  to paid Standard and Premium plans. Features and usage limits
                  for each plan are as described within the App.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  (2) Billing and Payment
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                  <li>
                    Paid plans are billed through the App Store (iOS) or Google
                    Play (Android).
                  </li>
                  <li>Billing is managed through RevenueCat.</li>
                  <li>
                    Prices are as displayed in your store of use (tax
                    inclusive).
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  (3) Auto-renewal of Subscriptions
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                  <li>
                    Paid plans renew automatically unless cancelled at least 24
                    hours before the end of the current period.
                  </li>
                  <li>
                    Cancellations should be made via the App Store (Settings &gt;
                    Subscriptions) or Google Play (Subscription management).
                  </li>
                  <li>
                    Refunds for cancellations during a billing period are
                    governed by App Store and Google Play policies.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  (4) Free Trial
                </h3>
                <p className="text-gray-600">
                  When a free trial is offered, the subscription will
                  automatically transition to the paid plan unless you cancel
                  before the trial ends.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 5. Prohibited Conduct
            </h2>
            <p className="mb-2 text-gray-700">
              Users must not engage in any of the following.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>
                Acts that violate laws, regulations, or public order and morals
              </li>
              <li>
                Reverse engineering, modifying, or duplicating the App
              </li>
              <li>
                Unauthorized access or excessive load on the App's servers
              </li>
              <li>Acts that infringe the rights of other users or third parties</li>
              <li>Spam, phishing, or fraudulent activity</li>
              <li>Other acts that the Company deems inappropriate</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 6. Disclaimers
            </h2>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  (1) Reading Responses
                </h3>
                <p className="text-gray-600">
                  Reading responses produced by the App are entertainment
                  content generated by AI. The App does not guarantee the
                  accuracy of any reading response, and reading responses must
                  not be used as a substitute for professional advice in
                  medical, legal, financial, or similar fields. Any decisions or
                  actions you take based on reading responses are at your sole
                  responsibility.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  (2) Service Continuity
                </h3>
                <p className="text-gray-600">
                  The Company may suspend or terminate the service without
                  notice due to maintenance, system failure, natural disasters,
                  or other reasons. The Company assumes no liability for any
                  resulting damages.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  (3) Limitation of Liability
                </h3>
                <p className="text-gray-600">
                  In the event of damages caused by reasons attributable to the
                  Company, the Company's total liability shall be limited to
                  the amount you paid to the Company in the preceding one
                  month.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 7. Intellectual Property Rights
            </h2>
            <p className="text-gray-700">
              All intellectual property rights in the contents of the App
              (including text, images, design, and program code) belong to the
              Company or rightful owners. Use, reproduction, or distribution
              beyond the scope explicitly permitted by these Terms is
              prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 8. Changes to the Terms
            </h2>
            <p className="text-gray-700">
              The Company may revise these Terms as necessary. The revised
              Terms become effective from the time they are posted on this
              page. Continued use of the App after such changes constitutes
              acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 9. Governing Law and Jurisdiction
            </h2>
            <p className="text-gray-700">
              These Terms shall be governed by and construed in accordance with
              the laws of Japan. The Tokyo District Court shall be the
              exclusive court of first instance for any disputes related to
              these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 10. Contact
            </h2>
            <p className="text-gray-700 mb-2">
              For questions or complaints regarding these Terms, please contact
              us:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-gray-700 space-y-1">
              <p>
                <span className="font-semibold">Company name: </span>
                {DEVELOPER_NAME}
              </p>
              <p>
                <span className="font-semibold">Email: </span>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-purple-600 underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
          </section>

          <div className="pt-4 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} {DEVELOPER_NAME}. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
