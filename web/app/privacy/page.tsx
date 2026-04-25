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
        title: "Privacy Policy | Ariadne: AI Reflection Dialogue",
        description:
          "Privacy Policy for Ariadne: AI Reflection Dialogue, an AI-facilitated tarot reflection dialogue experience.",
        alternates: {
          canonical: `${baseUrl}/privacy?lang=en`,
          languages: {
            ja: `${baseUrl}/privacy`,
            en: `${baseUrl}/privacy?lang=en`,
            "x-default": `${baseUrl}/privacy`,
          },
        },
      }
    : {
        title: "プライバシーポリシー | Ariadne - AI対話リーディング体験",
        description: "Ariadne - AI対話リーディング体験のプライバシーポリシー",
        alternates: {
          canonical: `${baseUrl}/privacy`,
          languages: {
            ja: `${baseUrl}/privacy`,
            en: `${baseUrl}/privacy?lang=en`,
            "x-default": `${baseUrl}/privacy`,
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

const EXTERNAL_SERVICES = [
  { name: "RevenueCat", url: "https://www.revenuecat.com/privacy" },
  { name: "Google Gemini API", url: "https://policies.google.com/privacy" },
  { name: "Groq", url: "https://groq.com/privacy-policy" },
  { name: "Google Sign-In", url: "https://policies.google.com/privacy" },
  { name: "Sign in with Apple", url: "https://www.apple.com/legal/privacy/" },
] as const;

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const locale = await getLocale(searchParams);
  return locale === "en" ? <PrivacyEN /> : <PrivacyJA />;
}

function PrivacyJA() {
  const externalServiceDescs: Record<string, string> = {
    RevenueCat: "サブスクリプション管理",
    "Google Gemini API": "AIリーディング応答の生成",
    Groq: "AIリーディング応答の生成",
    "Google Sign-In": "ソーシャルログイン（任意）",
    "Sign in with Apple": "ソーシャルログイン（任意）",
  };

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{APP_NAME_JA}</h1>
          <p className="text-lg font-semibold text-gray-700 mt-1">
            プライバシーポリシー
          </p>
          <p className="text-sm text-gray-500 mt-2">
            最終更新日：{LAST_UPDATED_JA}
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <p className="text-gray-700">
              {DEVELOPER_NAME}（以下「当社」）は、{APP_NAME_JA}
              （以下「本アプリ」）をご利用いただくにあたり、お客様の個人情報の取り扱いについて以下のとおり定めます。
            </p>
          </section>

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
                  <li>本アプリの利用状況（リーディング実施回数、利用プランなど）</li>
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
                  <li>リーディングに入力した相談内容・質問文</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第2条　情報の利用目的
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>本アプリのサービス提供および機能改善</li>
              <li>ユーザーアカウントの識別・管理</li>
              <li>サブスクリプション（課金）の管理</li>
              <li>AIによるリーディング応答の生成</li>
              <li>利用状況の分析およびサービス品質向上</li>
              <li>お問い合わせへの対応</li>
            </ul>
          </section>

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
              {EXTERNAL_SERVICES.map((s) => (
                <li key={s.name} className="flex items-start gap-1 text-gray-600">
                  <span className="text-purple-400 mt-0.5">▸</span>
                  <span>
                    <strong>{s.name}</strong>（{externalServiceDescs[s.name]}）：
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

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第6条　お子様のプライバシー
            </h2>
            <p className="text-gray-700">
              本アプリは13歳未満の方を対象としておらず、意図的に13歳未満の個人情報を収集することはありません。13歳未満のお子様の情報が収集されたと判明した場合は、速やかに削除します。
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              第7条　本ポリシーの変更
            </h2>
            <p className="text-gray-700">
              当社は、必要に応じて本ポリシーを改定することがあります。重要な変更がある場合は、アプリ内または本ページにてお知らせします。変更後もご利用を継続された場合は、改定後のポリシーに同意いただいたものとみなします。
            </p>
          </section>

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

function PrivacyEN() {
  const externalServiceDescs: Record<string, string> = {
    RevenueCat: "Subscription management",
    "Google Gemini API": "AI reading response generation",
    Groq: "AI reading response generation",
    "Google Sign-In": "Social sign-in (optional)",
    "Sign in with Apple": "Social sign-in (optional)",
  };

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{APP_NAME_EN}</h1>
          <p className="text-lg font-semibold text-gray-700 mt-1">
            Privacy Policy
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Last updated: {LAST_UPDATED_EN}
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <p className="text-gray-700">
              {DEVELOPER_NAME} ("the Company") sets forth the following policy
              regarding the handling of personal information of users of{" "}
              {APP_NAME_EN} ("the App").
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 1. Information We Collect
            </h2>
            <p className="mb-2 text-gray-700">
              The App may collect the following information for the purpose of
              providing its services.
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  (1) Automatically collected information
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                  <li>Device identifier (a unique device ID)</li>
                  <li>OS type and version, app version</li>
                  <li>
                    Usage information (number of reading sessions, current plan,
                    etc.)
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  (2) Information you provide
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
                  <li>
                    Social sign-in (Google / Apple): email address, display
                    name, profile picture URL
                  </li>
                  <li>
                    Content and questions you input during reading sessions
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 2. Purposes of Use
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>To provide and improve the services of the App</li>
              <li>To identify and manage user accounts</li>
              <li>To manage subscriptions (billing)</li>
              <li>
                To generate AI-facilitated reading responses for tarot
                reflection sessions
              </li>
              <li>To analyze usage and improve service quality</li>
              <li>To respond to inquiries</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 3. Disclosure to Third Parties
            </h2>
            <p className="mb-3 text-gray-700">
              The Company will not disclose collected information to third
              parties except in the following cases.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2 mb-4">
              <li>When the user has provided consent</li>
              <li>When disclosure is required by law</li>
              <li>
                When necessary to protect human life, safety, or property
              </li>
            </ul>
            <p className="mb-2 text-gray-700">
              The App also uses the following external services to provide its
              functionality. Information may be processed by each of these
              services in accordance with their respective privacy policies.
            </p>
            <ul className="space-y-2 ml-2">
              {EXTERNAL_SERVICES.map((s) => (
                <li key={s.name} className="flex items-start gap-1 text-gray-600">
                  <span className="text-purple-400 mt-0.5">▸</span>
                  <span>
                    <strong>{s.name}</strong> ({externalServiceDescs[s.name]}):
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 underline ml-1"
                    >
                      View privacy policy
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 4. Storage and Management of Data
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>
                Collected information is transmitted using encrypted
                communications (HTTPS).
              </li>
              <li>
                Data is stored on securely managed servers for the period
                necessary to operate the service.
              </li>
              <li>
                Data that is no longer needed is deleted using appropriate
                methods.
              </li>
              <li>
                For guest use, only the device identifier is used; no personally
                identifying information is collected.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 5. User Rights
            </h2>
            <p className="mb-2 text-gray-700">
              Users have the following rights regarding their personal
              information.
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 ml-2">
              <li>The right to request disclosure or confirmation</li>
              <li>The right to request correction or deletion</li>
              <li>The right to request that use be discontinued</li>
            </ul>
            <p className="mt-2 text-gray-700">
              For such requests, please contact us using the address below.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 6. Children's Privacy
            </h2>
            <p className="text-gray-700">
              The App is not intended for individuals under 13 years of age, and
              we do not knowingly collect personal information from children
              under 13. If we discover that information from a child under 13
              has been collected, we will promptly delete it.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 7. Changes to This Policy
            </h2>
            <p className="text-gray-700">
              The Company may revise this policy from time to time as necessary.
              Material changes will be announced within the App or on this page.
              Continued use of the App following such changes constitutes
              acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-1 border-b border-gray-200">
              Article 8. Contact
            </h2>
            <p className="text-gray-700 mb-2">
              For questions or requests regarding this policy, please contact:
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
