export type Locale = "ja" | "en";

function isSupported(value: string | undefined | null): value is Locale {
  return value === "ja" || value === "en";
}

/**
 * locale 解決の共通ロジック。
 *
 * 優先順位:
 * 1. `?lang=` クエリ（モバイルアプリからの明示伝達 / 共有リンクの言語指定）
 * 2. `NEXT_LOCALE` cookie（Web ユーザーが過去にマーケ LP で言語切替した履歴）
 * 3. `Accept-Language` ヘッダ（初訪 Web ユーザー / Apple 審査員）
 * 4. defaultLocale = "ja"
 *
 * Privacy / Terms / Signin など `[locale]` セグメント外の固定ページで使用する。
 */
export function resolveLocale(
  searchParams: { lang?: string | undefined } | undefined,
  cookieLocale: string | undefined,
  acceptLanguage: string | null | undefined
): Locale {
  if (isSupported(searchParams?.lang)) return searchParams.lang as Locale;
  if (isSupported(cookieLocale)) return cookieLocale as Locale;
  if (acceptLanguage?.toLowerCase().startsWith("en")) return "en";
  return "ja";
}
