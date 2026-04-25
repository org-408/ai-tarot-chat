# Apple 4.3(b) 対応 — 実装指示書

別セッションの Claude 向け実装指示書。[apple-43b-plan.md](./apple-43b-plan.md) の計画を実装する具体的な手順。

## 📌 進捗状況（2026-04-24 時点）

**この指示書は手順の参照用。進捗追跡は [GitHub Issue #234](https://github.com/org-408/ai-tarot-chat/issues/234) body の source of truth を参照すること。**

| Phase | 状態 | 備考 |
|---|---|---|
| Phase 1: モバイル i18n 基盤 | ✅ 完了 | `93bec5b` |
| Phase 2: 日本語 UI 文言 key 化 | ✅ 完了 | `41b9a77` |
| Phase 2.1: DB master data 多言語化（追加 phase） | ✅ 完了 | #238 / PR #239 |
| Phase 2.2: JA ハードコード残り + 追補（追加 phase） | ✅ 完了 | #241 / PR #242 |
| Phase 3: 英語翻訳 | ✅ 完了 | Phase 2/2.1/2.2 内で逐次実施。en.json 348 行、NG ワード grep クリーン |
| Phase 4: Settings 言語切替 UI | ✅ 完了 | Phase 2 内で実施。`sectionLanguage` / `langJa` / `langEn` |
| Phase 5: Web 側修正（5-1〜5-9） | ❌ 未着手 | 次セッションで着手。**2026-04-25 方針改訂: `[locale]/` 移設なし** |
| Phase 6: 型チェック・ビルド・最終統合検証 | ⚠️ 各 PR で部分実施 | Phase 5 全マージ後に最終実施 |
| Phase 7: App Store Connect 作業 | ❌ 未（ユーザー作業） | ドキュメント参照 |

**次にやるのは Phase 5 から。** セッション開始時は必ず `gh issue view 234` で最新進捗を確認。

### Phase 2.2 で確定した方針（Phase 5 以降に影響）

- **アプリ名サブタイトル統一**: アプリ内 UI（mobile / web `/auth/signin`）は JA/EN 共通で `"AI Reflection Dialogue"` を使用。App Store Connect のメタデータ表記（JA: `Ariadne - AI対話リーディング体験` / EN: `Ariadne: AI Reflection Dialogue`）とは別扱い。ブランド表記としての一貫性と NG ワード回避の自動担保が目的。

### Phase 5 方針（2026-04-25 改訂、PR #248 を上書き）

- **`[locale]/` 移設なし**で確定。Privacy / Terms / Signin は **現位置のまま**、ファイル内で locale 解決して JA/EN を切り替える
- locale 優先順位: `?lang=` クエリ > `NEXT_LOCALE` cookie > `Accept-Language` ヘッダ > `defaultLocale="ja"`
- モバイル → Web へは `?lang=` クエリで現在言語を伝達（path 移設不要）
- これに伴い旧 Task 5-8（後方互換リダイレクト）は**不要**、Task 5-9 はモバイル側 URL に `?lang=` を付ける軽量修正に縮小
- Web `(app)/` のリポジション（旧 Task 5-4）は **4.3(b) 通過後に延期**（既に i18n 化済みなので JA→JA 文字列置換は二度手間）

## 前提

- 計画書（[apple-43b-plan.md](./apple-43b-plan.md)）を **必ず先に読む**
- worktree ではなく、メインワークツリーまたは新規 worktree で作業する
- ベースブランチは **`staging`**（[.claude/rules/git-workflow.md](../.claude/rules/git-workflow.md)）
- コミット前の `tsc --noEmit` と `npm run build` は**必須**（[.claude/rules/git-workflow.md](../.claude/rules/git-workflow.md)）
- **各 PR マージ直後に [Issue #234](https://github.com/org-408/ai-tarot-chat/issues/234) body のチェックボックスを更新する**（運用ルール、2026-04-24 確定）

## 作業フェーズ

### Phase 1: モバイル i18n 基盤セットアップ（Day 1 前半、2〜3 時間）✅ 完了（`93bec5b`）

#### タスク 1-1: 依存関係追加

```bash
cd mobile
npm install i18next react-i18next
```

既存の `@capacitor/device` / `@capacitor/preferences` はそのまま使用。

#### タスク 1-2: i18n 設定ファイル作成

新規作成:

**`mobile/src/i18n/index.ts`**
```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ja from "./ja.json";
import en from "./en.json";

export const SUPPORTED_LANGS = ["ja", "en"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export async function initI18n(initialLang: SupportedLang) {
  await i18n.use(initReactI18next).init({
    resources: {
      ja: { translation: ja },
      en: { translation: en },
    },
    lng: initialLang,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export default i18n;
```

**`mobile/src/i18n/ja.json`** と **`mobile/src/i18n/en.json`** のスケルトン（後続タスクで埋める）

```json
{
  "common": {},
  "nav": {},
  "chat": {},
  "reading": {},
  "salon": {},
  "personal": {},
  "tarotist": {},
  "history": {},
  "auth": {},
  "plans": {},
  "settings": {},
  "home": {},
  "error": {}
}
```

#### タスク 1-3: 言語判定・初期化ロジック

**`mobile/src/lib/hooks/use-language.ts`** 新規作成

```typescript
import { Device } from "@capacitor/device";
import { Preferences } from "@capacitor/preferences";
import { useEffect, useState } from "react";
import i18n, { SUPPORTED_LANGS, SupportedLang, initI18n } from "@/i18n";

const PREF_KEY = "app-language";

export function useLanguage() {
  const [isReady, setIsReady] = useState(false);
  const [lang, setLangState] = useState<SupportedLang>("ja");

  useEffect(() => {
    (async () => {
      const { value } = await Preferences.get({ key: PREF_KEY });
      let initial: SupportedLang = "ja";
      if (value && SUPPORTED_LANGS.includes(value as SupportedLang)) {
        initial = value as SupportedLang;
      } else {
        const deviceLang = (await Device.getLanguageCode()).value;
        initial = deviceLang.startsWith("ja") ? "ja" : "en";
      }
      await initI18n(initial);
      setLangState(initial);
      setIsReady(true);
    })();
  }, []);

  const setLang = async (newLang: SupportedLang) => {
    await Preferences.set({ key: PREF_KEY, value: newLang });
    await i18n.changeLanguage(newLang);
    setLangState(newLang);
  };

  return { isReady, lang, setLang };
}
```

#### タスク 1-4: App.tsx で i18n 初期化を配線

[mobile/src/app.tsx](../mobile/src/app.tsx) の最上位で `useLanguage()` を呼び、`isReady` が `true` になるまでスプラッシュ表示。

---

### Phase 2: 日本語 UI 文言置換 + key 化（Day 1 後半、3〜4 時間）✅ 完了（`41b9a77`）

> **追加 phase として以下を後続対応**:
> - Phase 2.1（DB master data 多言語化）→ #238 / PR #239
> - Phase 2.2（JA ハードコード残り + 履歴詳細言語切替 + 占い師選択レイアウト + アプリ名サブタイトル統一）→ #241 / PR #242

対象ファイルを grep で特定し、一気に置換する。**i18n 化と日本語リポジションを同時に行う**。

#### 対象ファイル（優先順）

1. [mobile/src/components/home-page.tsx](../mobile/src/components/home-page.tsx)
2. [mobile/src/components/salon-page.tsx](../mobile/src/components/salon-page.tsx)
3. [mobile/src/components/personal-page.tsx](../mobile/src/components/personal-page.tsx)
4. [mobile/src/components/chat-panel.tsx](../mobile/src/components/chat-panel.tsx)
5. [mobile/src/components/clara-page.tsx](../mobile/src/components/clara-page.tsx)
6. [mobile/src/components/tarotist-page.tsx](../mobile/src/components/tarotist-page.tsx)
7. [mobile/src/components/tarotist-carousel-portrait.tsx](../mobile/src/components/tarotist-carousel-portrait.tsx)
8. [mobile/src/components/settings-page.tsx](../mobile/src/components/settings-page.tsx)
9. [mobile/src/components/history-page.tsx](../mobile/src/components/history-page.tsx)
10. [mobile/src/components/sidebar-menu.tsx](../mobile/src/components/sidebar-menu.tsx)
11. [mobile/src/components/header.tsx](../mobile/src/components/header.tsx)
12. [mobile/src/components/category-spread-selector.tsx](../mobile/src/components/category-spread-selector.tsx)

#### 置換ルール

計画書 **§9 日本語 UI 文言置換リスト** を参照。全 `<span>占い...</span>` を `{t("key")}` に置換し、`ja.json` にキーと日本語を追加。

#### 例

**Before** ([mobile/src/components/home-page.tsx](../mobile/src/components/home-page.tsx))
```tsx
<span className="text-sm font-medium text-purple-700">
  クイック占い
</span>
```

**After**
```tsx
<span className="text-sm font-medium text-purple-700">
  {t("home.quickReading")}
</span>
```

**ja.json**
```json
{ "home": { "quickReading": "クイックリーディング" } }
```

---

### Phase 3: 英語翻訳（Day 2 前半、2〜3 時間）✅ 完了

> Phase 2 / 2.1 / 2.2 内で en.json を逐次更新し 348 行に到達。NG ワード grep（`fortune|predict|horoscope|destiny|fate|zodiac`）は mobile/src/i18n/en.json および mobile/src/components/ 全域で検出ゼロ。

#### タスク 3-1: en.json を埋める

計画書 **§8 英語 UI ルール** を遵守:
- NG ワード（fortune / predict / horoscope / destiny / fate / future / zodiac）を絶対使わない
- トーン統一ガイドに沿った語彙

#### 参考: 主要キー例

```json
{
  "home": {
    "quickReading": "Quick Reading",
    "dialogueReading": "Dialogue Reading",
    "startQuick": "Start Quick Reading",
    "quickDesc": "Choose AI persona, theme, and spread",
    "dialogueDesc": "Reflect through dialogue with AI",
    "viewPersonas": "View AI Personas",
    "offlineReading": "Offline Reading",
    "offlineDesc": "Reflect offline with Clara",
    "recentSessions": "Recent Sessions",
    "historySaved": "Session history will be saved"
  },
  "reading": {
    "startReading": "Start Reading",
    "endSession": "End Session",
    "reading": "Reading"
  },
  "tarotist": {
    "persona": "AI Persona",
    "aiPersonas": "AI Personas"
  }
}
```

（全キーは Phase 2 で作成した `ja.json` をベースに生成）

#### タスク 3-2: NG ワード grep 検証

```bash
cd mobile
grep -rniE "fortune|predict|horoscope|destiny|fate|zodiac" src/i18n/en.json
grep -rniE "fortune|predict|horoscope|destiny|fate" src/components/ --include="*.tsx" --include="*.ts"
```

検出ゼロが合格。1 件でも残っていたら修正。

---

### Phase 4: Settings に言語切替 UI 追加（Day 2 後半、1 時間）✅ 完了

> settings-page.tsx に `sectionLanguage` セクション実装済み（`langJa` / `langEn` ラジオ、即時反映）。

[mobile/src/components/settings-page.tsx](../mobile/src/components/settings-page.tsx) に言語切替セクションを追加。

- `useLanguage()` フックから `lang` と `setLang` を取得
- ラジオボタンまたはセグメントコントロール: `日本語` / `English`
- 切り替え時に即時反映（i18n.changeLanguage）

---

### Phase 5: Web 側修正（Day 2 後半、2〜3 時間）

> **方針（2026-04-25 改訂、PR #248 を上書き）**: Phase 5 は **`[locale]/` 移設なし**で確定。`web/app/auth/signin/`・`web/app/privacy/`・`web/app/terms/` は **現位置のまま**、ファイル内で `?lang=` クエリ + `NEXT_LOCALE` cookie + `Accept-Language` ヘッダの優先順で locale を解決する。当初追補（PR #248）で示した `[locale]/` セグメント移設は既存 redirect / href の大量修正・配布済みモバイルアプリ互換性などの副作用が大きいため廃案。これに伴い Task 5-8（後方互換リダイレクト）は不要、Task 5-9 はモバイルから `?lang=` クエリを付ける軽量修正に縮小。
>
> 実装前に必ず [Issue #234 body](https://github.com/org-408/ai-tarot-chat/issues/234) を確認し、**Issue 側を最優先**とすること。本指示書はサンプルコードのリファレンスとして使う。

#### Phase 5 共通: locale 解決ヘルパ

Privacy / Terms / Signin など locale 解決が必要な複数のページで使う共通ヘルパを最初に作成する。

**新規作成**: `web/lib/utils/resolve-locale.ts`

```typescript
const SUPPORTED = ["ja", "en"] as const;
type Lang = (typeof SUPPORTED)[number];

function isSupported(value: string | undefined | null): value is Lang {
  return value === "ja" || value === "en";
}

export function resolveLocale(
  searchParams: { lang?: string | undefined } | undefined,
  cookieLocale: string | undefined,
  acceptLanguage: string | null | undefined
): Lang {
  if (isSupported(searchParams?.lang)) return searchParams.lang as Lang;
  if (isSupported(cookieLocale)) return cookieLocale as Lang;
  if (acceptLanguage?.toLowerCase().startsWith("en")) return "en";
  return "ja";
}
```

優先順位: `?lang=` クエリ > `NEXT_LOCALE` cookie > `Accept-Language` > `defaultLocale="ja"`。

サーバー側 Server Component / `generateMetadata` 内では `next/headers` の `cookies()` / `headers()` から値を取り出して渡す。

#### タスク 5-1: Privacy / Terms の JA リポジション

[web/app/privacy/page.tsx](../web/app/privacy/page.tsx) と [web/app/terms/page.tsx](../web/app/terms/page.tsx) を計画書 **§9 Privacy / Terms 置換** の表に従って修正。

加えて [web/app/delete-account/page.tsx](../web/app/delete-account/page.tsx) の `appName` 定数・metadata も「`AIタロット占い`」が残っていれば「`AI対話リーディング体験`」または「`Ariadne`」に置換。

#### タスク 5-2: ランディング

[web/app/page.tsx](../web/app/page.tsx) と [web/app/home-client.tsx](../web/app/home-client.tsx)、および [web/app/[locale]/(marketing)/page.tsx](../web/app/[locale]/\(marketing\)/page.tsx):
- 見出し・CTA・紹介文の「占い」を「リーディング / セッション / 対話」寄せに薄める
- ブログリンクをフッターのみに弱化（ヒーロー・上部ナビから削除）

#### タスク 5-3: サインイン JA 文言（5-7 と統合）

> **部分完了（PR #242）**: `web/app/auth/signin/page.tsx` のサブタイトル `"AI Tarot Chat"` は `"AI Reflection Dialogue"` に統一済み。

残りの JA 文言（`8人のAI占い師と22種のスプレッドで...` / `AIと対話するタロット占い` 等）は **Task 5-7（`useTranslations` 化）と同時に対応**。Task 5-7 で文言を `web/messages/ja.json` の `auth` namespace に移し、その過程で「占い」→「リーディング / 対話」のリポジションも行う。

#### タスク 5-4: Web 版 `(app)/` のリポジション（**4.3(b) 通過後に延期**）

> **2026-04-25 改訂**: 当初は「日本語のみ JA→JA 文字列置換、i18n 化なし」のスコープで予定していたが、現状確認の結果 `web/app/(app)/*` の各ページは既に `useTranslations` を使った i18n 実装済み（[web/app/(app)/layout.tsx](../web/app/\(app\)/layout.tsx) で `NextIntlClientProvider` ラップ + `NEXT_LOCALE` cookie ベース解決）であることが分かった。残「占い」ハードコードは 3 ファイル（`personal/page.tsx` / `clara/page.tsx` / `tarotists/page.tsx`）。
>
> 今これを JA→JA 文字列置換だけで済ますと、後で結局 `t()` 化する二度手間になる。Apple 審査員は通常 `(app)/` まで到達しない（サインイン後の挙動は Review Notes で説明）ため、**4.3(b) 通過後に正式 i18n 化（`t()` + `ja.json`/`en.json` 追加）で本対応**することにした。

- [ ] **延期**（4.3(b) 通過後に別 issue を切って `t()` 化を実施）

#### タスク 5-5: `/support` ページ新規作成

**目的**: App Store Connect の Support URL を退会ページから正しいサポートページに差し替える。残件解消。

新規作成: `web/app/support/page.tsx`

- Server Component（`"use client"` 不要）
- 日本語のみ、i18n 化なし
- 内容構成:
  1. ヘッダー: `サポート`
  2. **FAQ セクション**: [web/app/[locale]/(marketing)/pricing/page.tsx:330-351](../web/app/[locale]/\(marketing\)/pricing/page.tsx) の 5 項目（無料プラン・解約・アップグレード・オフライン・同期）をそのまま流用
  3. **お問い合わせセクション**: 連絡先メールアドレスの `mailto:` リンク → **`support@ariadne-ai.app`**
  4. フッター: プライバシーポリシー・利用規約へのリンク

**スタイル**: 既存の [web/app/privacy/page.tsx](../web/app/privacy/page.tsx) を参考にシンプルに

**メタデータ**:
```typescript
export const metadata: Metadata = {
  title: "サポート | Ariadne - AI対話リーディング体験",
  description: "Ariadne のサポート・よくある質問・お問い合わせ",
};
```

**注意**:
- pricing ページの FAQ を重複コピーする形で OK（共通化は今回スコープ外）

#### タスク 5-6: Privacy / Terms の多言語化（**`[locale]/` 移設なし**）

**目的**: 英語 UI のユーザーが Privacy / Terms リンクを踏んだ際に英語本文を表示する。Apple 4.3(b) の NG ワード（fortune / predict / horoscope / destiny / fate / zodiac）を EN 本文から排除する。

**前提**: タスク 5-1 の JA リポジション（`appName` / `占い` → `リーディング` 置換）が完了していること。未完ならこのタスクと同時実施。

##### 5-6-1: Web 側 — locale 分岐の導入（現位置のまま）

[web/app/privacy/page.tsx](../web/app/privacy/page.tsx) と [web/app/terms/page.tsx](../web/app/terms/page.tsx) は **ルート直下の固定ページのまま**（既存 URL を変えない）。ファイル内で共通ヘルパ `resolveLocale()` を呼んで JA/EN を切り替える。

```typescript
// 例: web/app/privacy/page.tsx
import { headers, cookies } from "next/headers";
import { resolveLocale } from "@/lib/utils/resolve-locale";

type SearchParams = { lang?: string };

async function getLocale(searchParams: Promise<SearchParams>) {
  const sp = await searchParams;
  const h = await headers();
  const c = await cookies();
  return resolveLocale(sp, c.get("NEXT_LOCALE")?.value, h.get("accept-language"));
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const lang = await getLocale(searchParams);
  return lang === "en"
    ? { title: "Privacy Policy | Ariadne", description: "..." }
    : { title: "プライバシーポリシー | Ariadne - AI対話リーディング体験", description: "..." };
}

export default async function PrivacyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const lang = await getLocale(searchParams);
  return lang === "en" ? <PrivacyEN /> : <PrivacyJA />;
}
```

- 優先順位: `?lang=` クエリ > `NEXT_LOCALE` cookie > `Accept-Language` ヘッダ > `defaultLocale="ja"`
- EN 本文は同ファイル内コンポーネント分割か、`privacy-en.tsx` / `privacy-ja.tsx` ファイル分離のどちらでも可（ボリュームに応じて判断）
- `appName_en = "Ariadne"`（日本語版の "AI対話リーディング体験" に相当する英語サブタイトルは App Store Connect と合わせる）

##### 5-6-2: EN 本文の作成

**スタイル**: 計画書 §8 英語 UI ルール厳守。NG ワード grep でゼロになること。

- JA 本文を直訳せず、**ポジショニングに整合する語彙**を使う
  - ❌ "fortune telling service" / "tarot reading results" / "predict your future" / "your destiny"
  - ✅ "AI-facilitated reflection dialogue using tarot cards" / "reflection session responses" / "entertainment content for self-reflection"
- 外部サービス（Google / Apple / RevenueCat / Groq 等）の Privacy Policy への外部リンクは英語版 URL が存在すればそちらへ（JA 版と同一 URL のまま OK なケースも多い）

##### 5-6-3: Mobile 側リンク修正

[mobile/src/components/settings-page.tsx:36-37](../mobile/src/components/settings-page.tsx) の定数は起動時に確定してしまうため、**関数化して毎回現在言語を読む**形に変更。

```typescript
// Before
const PRIVACY_URL = import.meta.env.VITE_PRIVACY_POLICY_URL || `${BFF_URL}/privacy`;
const TERMS_URL   = import.meta.env.VITE_TERMS_URL          || `${BFF_URL}/terms`;

// After（コンポーネント内）
import { useTranslation } from "react-i18next";

const { i18n } = useTranslation();
const lang = i18n.language?.startsWith("en") ? "en" : "ja";
const privacyBase = import.meta.env.VITE_PRIVACY_POLICY_URL || `${BFF_URL}/privacy`;
const termsBase   = import.meta.env.VITE_TERMS_URL          || `${BFF_URL}/terms`;
const privacyUrl = `${privacyBase}?lang=${lang}`;
const termsUrl   = `${termsBase}?lang=${lang}`;
```

**目的**: モバイルアプリで「OS は ja-JP のままアプリ内 EN モード」のユーザーが Privacy/Terms をタップしたとき、Accept-Language は `ja` だが `?lang=en` で Web 側が EN を表示する。

##### 5-6-4: Web 内の関連リンク修正

以下のリンクも locale に応じて `?lang=ja|en` を付与する:

- [web/app/(app)/settings/page.tsx:375-376](../web/app/\(app\)/settings/page.tsx) — `<SettingsRow href="/privacy" />` / `/terms` を `useLocale()` で現在 locale を取って `?lang=${locale}` 付与
- [web/app/[locale]/(marketing)/layout.tsx:200-205](../web/app/[locale]/\(marketing\)/layout.tsx) — フッター（`params.locale` を読んで `?lang=${locale}`）
- [web/components/auth/signin-form.tsx:276-285](../web/components/auth/signin-form.tsx) — サインインフォームの同意リンク（locale を props で受け取って `?lang=` 付与、5-7-1 と統合）

##### 5-6-5: SEO / ルーティング

- [web/app/sitemap.ts](../web/app/sitemap.ts) に `/privacy` と `/privacy?lang=en` の両エントリを追加（`/terms` も同様）
- Privacy/Terms ページに `<link rel="alternate" hreflang="ja" href="/privacy" />` / `<link rel="alternate" hreflang="en" href="/privacy?lang=en" />` を出す
- [web/app/robots.ts](../web/app/robots.ts) の `allow` リストは変更不要（クエリ付き URL もマッチする）

##### 5-6-6: 検証

```bash
# NG ワード grep（EN 本文含めて）
grep -rniE "fortune|predict|horoscope|destiny|fate|zodiac" web/app/privacy web/app/terms

# Mobile で言語切替 → Settings → Privacy / Terms タップ
#   ja: 日本語ページが開く（?lang=ja）
#   en: 英語ページが開く（?lang=en）

# Web 直接アクセス
#   /privacy（cookie/Accept-Language なし）→ JA
#   /privacy（Accept-Language: en-US）→ EN
#   /privacy?lang=en → EN
#   /privacy?lang=ja → JA
```

##### 5-6-7: アプリ名の他露出チェック

```bash
# "AIタロット占い" の残骸がないか全リポ grep
grep -rn "AIタロット占い" .
# 期待: 該当なし（あれば "AI対話リーディング体験" か "Ariadne" に置換）
```

#### タスク 5-7: Web サインイン + マーケティング LP の多言語化（**`[locale]/` 移設なし**）

**目的**: Apple Marketing URL (`ariadne-ai.app/`) は未認証時 `/auth/signin` にリダイレクトされる設計なので、サインインページが実質的ランディング。審査員が en-US 環境で踏んでも英語で着地させる。併せて `[locale]/(marketing)/` 配下の独立 LP も EN 化。

**前提**:
- next-intl の土台（middleware / routing / `messages/{ja,en}.json`）は既に完動
- [web/i18n/request.ts](../web/i18n/request.ts) は `[locale]` 外でも cookie ベースで locale 解決済み
- 作業は「JA 直書き → `useTranslations` + `en.json` にキー追加」の翻訳移行がメイン
- **ルーティング構造の変更は不要**（`web/app/auth/signin/page.tsx` は現位置のまま）

##### 5-7-1: サインインページの i18n 化（現位置のまま）

[web/app/auth/signin/page.tsx](../web/app/auth/signin/page.tsx) と [web/components/auth/signin-form.tsx](../web/components/auth/signin-form.tsx) を対象。

- `searchParams.lang` を `?isMobile=true&lang=...` から拾い、`resolveLocale()` で確定（`?lang=` クエリ → `NEXT_LOCALE` cookie → `Accept-Language` の順）
- Server Component 側: `getTranslations({ locale })` を locale 明示で呼ぶ（next-intl の standalone 用法）
- Client Component 側 (`SignInForm`): locale を props で渡し、内部で `useTranslations` ではなく **props 経由のテキスト** を受け取る形でも良い（または `NextIntlClientProvider` で囲んで `useTranslations` を使う）
- マーケ LP 誘導リンクの動的化: 現状 `href="/ja"` / `href="/ja/pricing"` ハードコード（[signin/page.tsx:152, :280](../web/app/auth/signin/page.tsx)）を `href={`/${locale}`}` / `href={`/${locale}/pricing`}` に変更
- Privacy/Terms 同意リンク（5-6-4 と統合）も locale を props で渡して `?lang=` 付与

`web/messages/{ja,en}.json` の `auth` namespace に追加するキー例:
- `auth.signinTitle` / `auth.signinDescription`
- `auth.signinWithGoogle` / `auth.signinWithApple`
- `auth.termsAgreement` / `auth.privacyAgreement`
- `auth.viewServiceDetails` / `auth.viewPricing`
- `auth.heroSubtitle1` / `auth.heroSubtitle2`（`8人のAI占い師...` 等の Task 5-3 残文言）

```tsx
// signin/page.tsx
export default async function SignInPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const c = await cookies();
  const h = await headers();
  const locale = resolveLocale(sp, c.get("NEXT_LOCALE")?.value, h.get("accept-language"));
  const t = await getTranslations({ locale, namespace: "auth" });

  // ...
  return (
    <Link href={`/${locale}`}>{t("viewServiceDetails")}</Link>
    <Link href={`/${locale}/pricing`}>{t("viewPricing")}</Link>
  );
}
```

これを怠ると EN 審査員が EN サインインから JA マーケ LP に飛ばされるので必須。

**EN 文言は Apple 4.3(b) NG ワード禁止** (`fortune` / `predict` / `horoscope` / `destiny` / `fate` / `zodiac`)。計画書 §8 のトーン統一ルールに従う。

##### 5-7-2: マーケティング LP の i18n 化

[web/app/[locale]/(marketing)/page.tsx](../web/app/[locale]/\(marketing\)/page.tsx) を対象（pricing / ranking / download は優先度低、余力があれば同時対応）。

- 既存の JA 直書き文字列（`features` 配列 / metadata / ヒーロー文言 / CTA）を `useTranslations("marketing")` 経由に置換
- `metadata` を `generateMetadata` に変更し、`getTranslations("marketing")` で title / description を locale 別に生成
- `web/messages/{ja,en}.json` の `marketing` namespace にキー追加:
  - `marketing.heroTitle` / `marketing.heroDescription`
  - `marketing.feature1Title` / `marketing.feature1Description` ...
  - `marketing.ctaStart` / `marketing.ctaTarotists` 等

**EN 側の NG ワード回避例**（§8 トーン統一ガイド適用）:
- ❌ "Your personal AI fortune teller" → ✅ "AI-facilitated tarot reflection dialogue"
- ❌ "Predict your future" → ✅ "Reflect on what's next"
- ❌ "Tarot fortune-telling app" → ✅ "Tarot-based reflection experience"
- ❌ "Daily horoscope" → ✅ "Daily reflection"
- ❌ "Discover your destiny" → ✅ "Explore your inner narrative"

##### 5-7-3: Apple Marketing URL の扱い

**変更不要**。App Store Connect の Marketing URL は `https://ariadne-ai.app/` のまま。

- 未認証 en-US 審査員のフロー: `/` → `redirect("/auth/signin")` → サインインページが Accept-Language ベースで EN 表示
- 未認証 ja-JP ユーザーのフロー: 同上で JA 表示
- マーケティング LP を直接見たい場合は `/en` or `/ja`（既に存在）

##### 5-7-4: 検証

```bash
# NG ワード grep（en.json + EN 文面）
cd web
grep -niE "fortune|predict|horoscope|destiny|fate|zodiac" messages/en.json
grep -rniE "fortune|predict|horoscope|destiny|fate|zodiac" app/auth/ "app/[locale]/(marketing)/"

# 手動確認
# - Chrome DevTools の Sensors で Accept-Language を en-US に → ariadne-ai.app/ を開く → 英語サインインページ + 内部リンクが /en に向く
# - /en → 英語 LP、/ja → 日本語 LP
# - /auth/signin?lang=en で強制 EN 表示
```

#### タスク 5-8: 旧 URL の後方互換リダイレクト（**不要、削除**）

> **2026-04-25 改訂**: 5-6 / 5-7 で `[locale]/` 移設しないため、旧 URL（`/privacy` / `/terms` / `/auth/signin`）はそのまま動き続ける。後方互換リダイレクトは**不要**。

#### タスク 5-9: モバイル → Web サインインへの locale 伝播（**`?lang=` クエリ追加に縮小**）

> **2026-04-25 改訂**: `[locale]/` 移設をしないため path 化は不要。モバイル側で `?lang=` クエリを付けるだけの軽量修正に縮小。

**目的**: モバイルアプリで「日本で英語設定」しているユーザー（OS は ja-JP、アプリ内は EN）が Web サインインを開いたとき、Accept-Language は `ja` のままなので Web サインインが JA 表示になる問題を解消する。

**変更対象**:
- [mobile/src/lib/services/auth.ts:138](../mobile/src/lib/services/auth.ts) の `signInWithWeb()` URL 組み立てを変更
  - Before: `new URL("/auth/signin?isMobile=true", baseUrl)`
  - After: `new URL(\`/auth/signin?isMobile=true&lang=\${lang}\`, baseUrl)`
  - **path は変えない**（`/auth/signin` のまま）
  - 引数で `lang: "ja" | "en"` を受け取る形に
- [mobile/src/lib/stores/auth.ts:226](../mobile/src/lib/stores/auth.ts) 呼び出し元で `useLanguage()` 経由の現在言語を渡す
  - Store のシグネチャ変更、呼び出し側コンポーネントで language を受け渡し
- プラン変更起点のサインイン（`mobile/src/components/lower-viewer.tsx` / `home-page.tsx` 等）も Store 経由なので一括対応
- Privacy / Terms のリンクは Task 5-6-3 で同じ `?lang=` 付与方式に揃えるためこのタスクでは追加作業なし

**検証**:
- モバイル EN モード（OS は JA）→ サインインボタン → Web サインイン画面が EN 表示
- モバイル JA モード → Web サインイン画面が JA 表示
- モバイル EN モード → Settings → Privacy タップ → EN Privacy 表示（5-6-3 連携）

---

### Phase 6: 型チェック・ビルド・PR（Day 2 最後、1 時間）

```bash
# Mobile
cd mobile
npx tsc --noEmit
npm run build

# Web
cd ../web
npx tsc --noEmit
npm run build
```

型エラー・ビルドエラーがゼロになったら staging にブランチを push、PR 作成。

```bash
gh pr create --base staging --title "feat: 4.3(b) 対応 - i18n + リポジション" --body "..."
```

---

### Phase 7: App Store Connect 作業（ユーザー作業）

計画書 **§10 App Store Connect 編集箇所サマリ** に従ってメタデータを設定。

手順は以下の順:

1. App Information の ja/en 各項目（アプリ名、サブタイトル、カテゴリ）
2. 該当バージョン（1.0 Prepare for Submission 等）の各項目（説明文、キーワード、Support URL、Marketing URL、Review Notes）
3. スクリーンショット撮影・アップロード（ja/en × デバイスサイズ別 5 枚ずつ）
4. ビルド 44 以上を TestFlight にアップロード、Build セクションで選択
5. **TestFlight で実機確認**（両言語）
6. Submit for Review
7. Resolution Center に返信（計画書 §4）

---

## 品質チェックリスト

### コード側

- [x] モバイル i18n 実装完了（ja.json + en.json）— Phase 1/2
- [x] 対象画面すべて `useTranslation` 経由で `t(key)` 使用 — Phase 2/2.2
- [x] NG ワード grep クリーン（fortune / predict / horoscope / destiny / fate / future / zodiac）— mobile 側検証済み
- [x] 英語 UI トーン統一（Fortune Master / Tarot Reading 等のラベル無し）
- [x] エラーメッセージ・コメントに「fortune」等遺物なし
- [x] 未翻訳キーの挙動を確認
- [x] Settings に言語切替 UI 追加済み — Phase 4
- [x] アプリ内 UI の "AI Tarot Chat" 残骸排除（JA/EN 共通 "AI Reflection Dialogue" に統一）— PR #242
- [ ] Privacy / Terms の `appName` 変更済み — **Task 5-1 残**
- [ ] ランディングのブログリンクがフッターのみ — **Task 5-2 残**
- [ ] Web 版 `(app)/` のリポジション — **Task 5-4: 4.3(b) 通過後に延期**
- [ ] `/support` ページ新規作成完了（FAQ + お問い合わせ）— **Task 5-5 残**
- [ ] Privacy / Terms の多言語化完了（タスク 5-6、`[locale]/` 移設なし）
  - [ ] 共通ヘルパ `resolveLocale()` 作成（`web/lib/utils/resolve-locale.ts`）
  - [ ] Web サーバー側 locale 分岐（`?lang=` > cookie > Accept-Language）
  - [ ] EN 本文（NG ワード grep クリーン）
  - [ ] Mobile の Privacy/Terms リンクが `?lang=ja|en` を付与
  - [ ] Web 内関連リンク（settings / marketing footer / signin-form）も `?lang=` 対応
  - [ ] sitemap / hreflang に `?lang=en` エントリ追加
  - [ ] `AIタロット占い` 文字列の残骸なし
- [ ] サインイン + マーケティング LP の多言語化完了（タスク 5-7、`[locale]/` 移設なし）
  - [ ] `web/app/auth/signin/page.tsx` が現位置のまま `getTranslations({ locale })` で EN 表示
  - [ ] サインイン内マーケ LP リンクが `/${locale}` / `/${locale}/pricing` に動的化
  - [ ] `[locale]/(marketing)/page.tsx` が `useTranslations` 経由で EN 文言を返す
  - [ ] `en.json` の `auth` / `marketing` namespace に NG ワード不使用で翻訳追加
  - [ ] Marketing URL は `ariadne-ai.app/` のまま（変更なし）
- [x] **タスク 5-8（旧 URL リダイレクト）は不要に変更**（`[locale]/` 移設なしのため）
- [ ] モバイル → Web サインインへの locale 伝播（タスク 5-9、`?lang=` クエリ追加のみ）
  - [ ] `signInWithWeb()` の URL に `?isMobile=true&lang=${lang}` を付与
  - [ ] Store のシグネチャ変更で呼び出し元から language を受け渡し
- [ ] `cd mobile && npx tsc --noEmit` クリーン — 各 PR で確認済み、Phase 5 マージ後に最終実施
- [ ] `cd web && npx tsc --noEmit && npm run build` クリーン — 各 PR で確認済み、Phase 5 マージ後に最終実施
- [ ] **Apple 審査員シミュレーション**: Chrome DevTools Sensors で `Accept-Language: en-US` → `ariadne-ai.app/` → 英語サインイン表示 / `/privacy` → 英語 Privacy
- [ ] **モバイル EN + JA OS シミュレーション**: モバイル Settings で EN 切替 → サインインボタン → Web 英語サインイン / Privacy タップ → 英語 Privacy

### App Store Connect 側（ユーザー）

- [ ] 日本語アプリ名 `Ariadne - AI対話リーディング体験`
- [ ] 英語アプリ名 `Ariadne: AI Reflection Dialogue`
- [ ] カテゴリ両ロケール Lifestyle
- [ ] 日本語説明冒頭「AIキャラクターと対話する、タロットを用いた…」
- [ ] 英語説明に "not predictive astrology" + "Native bilingual support"
- [ ] Review Notes に 7 項目 + USER FLOW 段落
- [ ] Resolution Center 返信に "either English or Japanese locale"
- [ ] スクショ 1 枚目がチャット画面
- [ ] スクショを ja / en 両ロケールで別撮影
- [ ] スクショにカード大写しなし
- [ ] **Support URL を `/support` に更新**（退会ページから差し替え）
- [ ] Account Deletion URL フィールドに `/delete-account` を設定（App Privacy）
- [ ] Marketing URL がランディング
- [ ] ビルド番号 44 以上

### TestFlight 実機確認（ユーザー）

- [ ] 日本語 UI: 初回起動で「占い」連呼なし
- [ ] 英語 UI（iPhone 言語を English に）:
  - [ ] 全画面英語表示
  - [ ] "fortune" "predict" "horoscope" "destiny" が画面に出ない
  - [ ] エラー遷移時の英語メッセージも違和感なし
  - [ ] 未翻訳キーがそのまま表示されていない
- [ ] CTA 押下後すぐに占い感が出ない
- [ ] コーチマークが両言語で正常表示
- [ ] Settings の言語切替が動作

---

## 注意事項

- **SEO 資産保護**: ブログ記事・X 投稿・日本語マーケティングコピーは変更しない
- **スコープ厳守**: 計画書 **§14 やらないこと** を厳守。音声モードや iOS Widget 等の機能追加は今回スコープ外
- **モバイル固有ルール**: `CapacitorHttp.enabled: false` は絶対に変更しない（[.claude/rules/mobile.md](../.claude/rules/mobile.md)）
- **コミットは明示指示時のみ**（[.claude/rules/](../.claude/rules/) の auto memory に準拠）
- **git-workflow**: PR は `--base staging`（[.claude/rules/git-workflow.md](../.claude/rules/git-workflow.md)）
