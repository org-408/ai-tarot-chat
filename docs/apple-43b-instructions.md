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
| Phase 5: Web 側修正（5-1〜5-7） | ❌ 未着手 | 次セッションで着手 |
| Phase 6: 型チェック・ビルド・最終統合検証 | ⚠️ 各 PR で部分実施 | Phase 5 全マージ後に最終実施 |
| Phase 7: App Store Connect 作業 | ❌ 未（ユーザー作業） | ドキュメント参照 |

**次にやるのは Phase 5 から。** セッション開始時は必ず `gh issue view 234` で最新進捗を確認。

### Phase 2.2 で確定した方針（Phase 5 以降に影響）

- **アプリ名サブタイトル統一**: アプリ内 UI（mobile / web `/auth/signin`）は JA/EN 共通で `"AI Reflection Dialogue"` を使用。App Store Connect のメタデータ表記（JA: `Ariadne - AI対話リーディング体験` / EN: `Ariadne: AI Reflection Dialogue`）とは別扱い。ブランド表記としての一貫性と NG ワード回避の自動担保が目的。

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

> **追補（2026-04-25）**: 本 Phase 5 のルーティング方針は `[locale]` セグメント統一に改訂された（Issue #234 Task 5-6 / 5-7）。併せて後方互換リダイレクト（Task 5-8）とモバイル → Web locale 伝播（Task 5-9）が追加されている。以下の手順は当初検討のまま残しているが、実装前に必ず [Issue #234 body](https://github.com/org-408/ai-tarot-chat/issues/234) を確認し、矛盾する箇所は Issue 側を優先すること。

#### タスク 5-1: Privacy / Terms

[web/app/privacy/page.tsx](../web/app/privacy/page.tsx) と [web/app/terms/page.tsx](../web/app/terms/page.tsx) を計画書 **§9 Privacy / Terms 置換** の表に従って修正。

#### タスク 5-2: ランディング

[web/app/page.tsx](../web/app/page.tsx) と [web/app/home-client.tsx](../web/app/home-client.tsx):
- 見出し・CTA・紹介文の「占い」を「リーディング / セッション / 対話」寄せに薄める
- ブログリンクをフッターのみに弱化（ヒーロー・上部ナビから削除）

#### タスク 5-3: サインイン

[web/app/auth/](../web/app/auth/) のタイトル・見出しの「占い」を軽く薄める。

> **部分完了（PR #242）**: `web/app/auth/signin/page.tsx` のサブタイトル `"AI Tarot Chat"` は `"AI Reflection Dialogue"` に統一済み。`web/messages/{ja,en}.json` の `auth.signInTitle` / `home.title` も同様。残りの JA 文言（`8人のAI占い師と22種のスプレッドで...` / `AIと対話するタロット占い` 等）は Task 5-7（next-intl 化）で対応。

#### タスク 5-4: Web 版 `(app)/` の軽いスイープ

Web 版は**プレローンチ段階**（公開前）。[web/app/(app)/](../web/app/\(app\)/) は **4.3b スコープ外**のため、日本語のみ「占い → リーディング」置換（i18n 化はしない、ロジック変更なし）:

```bash
# 対象ファイルの特定
grep -rln "占い" web/app/\(app\)/
```

各ファイルで UI 文言の「占い」を置換。**スコープ厳守**: 日本語文字列のみ、ロジック変更なし。

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

#### タスク 5-6: Privacy / Terms の多言語化（#234 Phase 5）

> **追補（2026-04-25）**: 当初の `?lang=` クエリ方式は **`[locale]` セグメント方式（`/[locale]/privacy`）に改訂**。以下 5-6-1〜5-6-7 は初期検討のまま残しているため、実装時は [Issue #234 Task 5-6](https://github.com/org-408/ai-tarot-chat/issues/234) を優先参照すること。

**目的**: 英語 UI のユーザーが Privacy / Terms リンクを踏んだ際に英語本文を表示する。Apple 4.3(b) の NG ワード（fortune / predict / horoscope / destiny / fate / zodiac）を EN 本文から排除する。

**前提**: タスク 5-1 の JA リポジション（`appName` / `占い` → `リーディング` 置換）が完了していること。未完ならこのタスクと同時実施。

##### 5-6-1: Web 側 — locale 分岐の導入

[web/app/privacy/page.tsx](../web/app/privacy/page.tsx) と [web/app/terms/page.tsx](../web/app/terms/page.tsx) はルート直下の固定ページ。**URL を変えない方針**（既存の App Store Connect / ブログ / メール等からの被リンクを壊さない）でサーバー側 locale 判定を入れる。

```typescript
// 例: web/app/privacy/page.tsx
import { headers } from "next/headers";

type SearchParams = { lang?: string };

function resolveLang(searchParams: SearchParams, acceptLanguage: string | null): "ja" | "en" {
  if (searchParams.lang === "en") return "en";
  if (searchParams.lang === "ja") return "ja";
  if (acceptLanguage?.toLowerCase().startsWith("en")) return "en";
  return "ja";
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const h = await headers();
  const lang = resolveLang(sp, h.get("accept-language"));
  return lang === "en"
    ? { title: "Privacy Policy | Ariadne", description: "..." }
    : { title: "プライバシーポリシー | Ariadne - AI対話リーディング体験", description: "..." };
}
```

- `?lang=en` クエリを最優先、なければ `Accept-Language` ヘッダで判定
- EN 本文は同ファイル内または `privacy-en.tsx` 分離のどちらでも可（ボリュームに応じて判断）
- `appName_en = "Ariadne"`（日本語版の "AI対話リーディング体験" に相当する英語サブタイトルは App Store Connect と合わせる）

##### 5-6-2: EN 本文の作成

**スタイル**: 計画書 §8 英語 UI ルール遵守。NG ワード grep でゼロになること。

- JA 本文を直訳せず、**ポジショニングに整合する語彙**を使う
  - ❌ "fortune telling service" / "tarot reading results"
  - ✅ "AI-facilitated reflection dialogue using tarot cards" / "reflection session responses"
- 外部サービス（Google / Apple / RevenueCat / Groq 等）の Privacy Policy への外部リンクは英語版 URL が存在すればそちらへ（JA 版と同一 URL のまま OK なケースも多い）

##### 5-6-3: Mobile 側リンク修正

[mobile/src/components/settings-page.tsx:36-37](../mobile/src/components/settings-page.tsx) の定数は起動時に確定してしまうため、**関数化して毎回現在言語を読む**形に変更。

```typescript
// Before
const PRIVACY_URL = import.meta.env.VITE_PRIVACY_POLICY_URL || `${BFF_URL}/privacy`;
const TERMS_URL   = import.meta.env.VITE_TERMS_URL          || `${BFF_URL}/terms`;

// After
import { useTranslation } from "react-i18next";

const { i18n } = useTranslation();
const lang = i18n.language?.startsWith("en") ? "en" : "ja";
const privacyUrl = `${import.meta.env.VITE_PRIVACY_POLICY_URL || `${BFF_URL}/privacy`}?lang=${lang}`;
const termsUrl   = `${import.meta.env.VITE_TERMS_URL          || `${BFF_URL}/terms`  }?lang=${lang}`;
```

##### 5-6-4: Web 内の関連リンク修正

以下のリンクも locale に応じて `?lang=en` を付与（または既存 i18n 機構に合わせる）:

- [web/app/(app)/settings/page.tsx:375-376](../web/app/\(app\)/settings/page.tsx) — `<SettingsRow href="/privacy" />` / `/terms`
- [web/app/[locale]/(marketing)/layout.tsx:200-205](../web/app/[locale]/\(marketing\)/layout.tsx) — フッター（`[locale]` パラメータを読んで分岐）
- [web/components/auth/signin-form.tsx:276-285](../web/components/auth/signin-form.tsx) — サインインフォームの同意リンク

##### 5-6-5: SEO / ルーティング

- [web/app/sitemap.ts:24-25](../web/app/sitemap.ts) に `?lang=en` のエントリを追加するか、`hreflang` で ja/en 別エントリを出す
- [web/app/robots.ts:9](../web/app/robots.ts) の `allow` リストは変更不要（クエリ付き URL もマッチする）
- `/privacy` の OG / canonical は JA をデフォルト、EN は `<link rel="alternate" hreflang="en" href="/privacy?lang=en" />` を追加

##### 5-6-6: 検証

```bash
# NG ワード grep（EN 本文含めて）
grep -rniE "fortune|predict|horoscope|destiny|fate|zodiac" web/app/privacy web/app/terms

# Mobile で言語切替 → Settings → Privacy / Terms タップ
#   ja: 日本語ページが開く
#   en: 英語ページが開く（?lang=en が付く）

# Web 版の /privacy と /privacy?lang=en を直接開いて両方表示できることを確認
```

##### 5-6-7: アプリ名の他露出チェック

```bash
# "AIタロット占い" の残骸がないか全リポ grep
grep -rn "AIタロット占い" .
# 期待: 該当なし（あれば "AI対話リーディング体験" か "Ariadne" に置換）
```

#### タスク 5-7: Web サインイン + マーケティングページの多言語化

> **追補（2026-04-25）**: 「ルーティング構造の変更は不要」の前提は誤り。**サインインページを `web/app/[locale]/auth/signin/` に移設する**方針に改訂された（`NextIntlClientProvider` ラップ方式は廃案）。以下 5-7-1〜5-7-4 は初期検討のまま残しているため、実装時は [Issue #234 Task 5-7](https://github.com/org-408/ai-tarot-chat/issues/234) を優先参照すること。

**目的**: Apple Marketing URL (`ariadne-ai.app/`) は未認証時 `/auth/signin` にリダイレクトされる設計なので、サインインページが実質的ランディング。審査員が en-US 環境で踏んでも英語で着地させる。併せて `[locale]/(marketing)/` 配下の独立 LP も EN 化。

**前提**:
- next-intl の土台（middleware / routing / `messages/{ja,en}.json`）は既に完動
- 作業は「JA 直書き → `useTranslations` + `en.json` にキー追加」の翻訳移行がメイン。**ルーティング構造の変更は不要**

##### 5-7-1: サインインページの i18n 化

[web/app/auth/signin/page.tsx](../web/app/auth/signin/page.tsx) と [web/components/auth/signin-form.tsx](../web/components/auth/signin-form.tsx) を対象。

- Server Component 側: `getTranslations("auth")` を使用
- Client Component 側: `useTranslations("auth")` を使用
- 言語判定: next-intl の既存フロー（`NEXT_LOCALE` cookie → `Accept-Language` ヘッダ → `defaultLocale: "ja"`）に乗る
  - [web/i18n/request.ts](../web/i18n/request.ts) が cookie ベースで locale 解決済み
  - サインインページは `[locale]` ルート外だが、`NextIntlClientProvider` でラップすれば同じ仕組みが使える
- `web/messages/ja.json` / `web/messages/en.json` の `auth` namespace に以下のようなキーを追加:
  - `auth.signinTitle` / `auth.signinDescription`
  - `auth.signinWithGoogle` / `auth.signinWithApple`
  - `auth.termsAgreement` / `auth.privacyAgreement`（5-6-4 の Privacy/Terms リンクと同期）
  - `auth.viewServiceDetails` / `auth.viewPricing`（マーケ LP 誘導リンクのテキスト）

**サインイン内マーケ LP リンクの locale 動的化（重要）**:

[web/app/auth/signin/page.tsx:152](../web/app/auth/signin/page.tsx) と [同:280](../web/app/auth/signin/page.tsx) には現在マーケ LP への導線リンクが 2 箇所あるが **`href="/ja"` / `href="/ja/pricing"` のハードコード**。サインインページが「サインイン + マーケ誘導」を兼ねる設計なので、現在 locale（`NEXT_LOCALE` cookie → `Accept-Language` → `defaultLocale`）に応じた動的 href に変更する:

```tsx
// Before
<Link href="/ja">サービスの詳細・料金を見る</Link>
<Link href="/ja/pricing">料金プランを見る</Link>

// After
<Link href={`/${locale}`}>{t("auth.viewServiceDetails")}</Link>
<Link href={`/${locale}/pricing`}>{t("auth.viewPricing")}</Link>
```

これを怠ると EN 審査員が EN サインインから JA マーケ LP に飛ばされるので必須。

**EN 文言は Apple 4.3(b) NG ワード禁止** (`fortune` / `predict` / `horoscope` / `destiny` / `fate` / `zodiac`)。計画書 §8 のトーン統一ルールに従う。

##### 5-7-2: マーケティング LP の i18n 化

[web/app/[locale]/(marketing)/page.tsx](../web/app/[locale]/\(marketing\)/page.tsx) を対象（pricing / ranking / download は優先度低、余力があれば同時対応）。

- 既存の JA 直書き文字列（`features` 配列 / metadata / ヒーロー文言 / CTA）を `useTranslations("marketing")` 経由に置換
- `metadata` は `generateMetadata` に変更し、`getTranslations("marketing")` で title / description を locale 別に生成
- `web/messages/{ja,en}.json` の `marketing` namespace にキー追加:
  - `marketing.heroTitle` / `marketing.heroDescription`
  - `marketing.feature1Title` / `marketing.feature1Description` ...
  - `marketing.ctaStart` / `marketing.ctaTarotists` 等

**EN 側の NG ワード回避例**:
- ❌ "Your personal AI fortune teller" → ✅ "AI-facilitated tarot reflection dialogue"
- ❌ "Predict your future" → ✅ "Reflect on what's next"
- ❌ "Tarot fortune-telling app" → ✅ "Tarot-based reflection experience"

##### 5-7-3: Apple Marketing URL の扱い

**変更不要**。App Store Connect の Marketing URL は `https://ariadne-ai.app/` のまま。

- 未認証 en-US 審査員のフロー: `/` → `redirect("/auth/signin")` → EN サインインページ（5-7-1 後）
- 未認証 ja-JP ユーザーのフロー: `/` → `redirect("/auth/signin")` → JA サインインページ
- マーケティング LP を直接見たい場合は `/en` or `/ja`（既に存在）

##### 5-7-4: 検証

```bash
# NG ワード grep（en.json + EN 文面）
cd web
grep -niE "fortune|predict|horoscope|destiny|fate|zodiac" messages/en.json
grep -rniE "fortune|predict|horoscope|destiny|fate|zodiac" app/auth/ app/\[locale\]/\(marketing\)/

# 手動確認
# - Chrome DevTools で Accept-Language を en-US に → ariadne-ai.app/ を開く → 英語サインインページが出る
# - /en → 英語 LP、/ja → 日本語 LP
# - Mobile の Privacy/Terms リンク（5-6-3）が現在言語で飛ぶ
```

#### タスク 5-8: 旧 URL の後方互換リダイレクト（2026-04-25 追加）

詳細は [Issue #234 Task 5-8](https://github.com/org-408/ai-tarot-chat/issues/234) を参照。

**要点**:
- Task 5-6 / 5-7 で `privacy` / `terms` / `auth/signin` を `[locale]/` 下に移設するため、旧 URL（App Store Connect 登録済み、SNS・ブログ被リンク、旧バージョンモバイルアプリからの動線）が 404 にならないようリダイレクトを用意
- `web/proxy.ts` の `skipIntl` からこれらのパスを外せば next-intl middleware が `localePrefix: "always"` デフォルトで `/privacy` → `/ja/privacy` 相当のリダイレクトを処理する想定
- 効かないケース（`/auth/signin` 等）は `web/proxy.ts` で手動 307 リダイレクトを追加
- 検証: `curl -I .../privacy` / `.../terms` / `.../auth/signin` がそれぞれ `/ja/...` にリダイレクトされる、`Accept-Language: en-US` 付与時は `/en/...` へ

#### タスク 5-9: モバイル → Web サインインへの locale 伝播（2026-04-25 追加）

詳細は [Issue #234 Task 5-9](https://github.com/org-408/ai-tarot-chat/issues/234) を参照。

**要点**:
- モバイルアプリでユーザーが手動で EN を選択している場合、OS の Accept-Language は JA のままなので Web サインインが JA 表示になる問題
- 解決: モバイルから Web サインインを開く URL を `/${lang}/auth/signin?isMobile=true` としてパスに lang を乗せる
- 変更対象:
  - `mobile/src/lib/services/auth.ts:137` の `signInWithWeb()` URL 組み立て（引数で `lang: "ja" | "en"` を受け取る形に）
  - `mobile/src/lib/stores/auth.ts:226` 呼び出し元で `useLanguage()` 経由の現在言語を渡す（Store のシグネチャ変更）
  - プラン変更起点のサインイン（`mobile/src/components/lower-viewer.tsx` / `home-page.tsx` 等）も Store 経由なので一括対応
- Privacy / Terms のリンクは Task 5-6-3 で同様のパス方式に改訂済みのため、このタスクでは追加作業なし

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
- [ ] Web 版 `(app)/` の日本語スイープ完了 — **Task 5-4 残**
- [ ] `/support` ページ新規作成完了（FAQ + お問い合わせ）— **Task 5-5 残**
- [ ] Privacy / Terms の多言語化完了（タスク 5-6、#234 Phase 5）
  - [ ] Web サーバー側 locale 分岐（`?lang=en` + Accept-Language）
  - [ ] EN 本文（NG ワード grep クリーン）
  - [ ] Mobile の Privacy/Terms リンクが現在言語に応じた URL を生成
  - [ ] Web 内関連リンク（settings / marketing footer / signin-form）も locale 対応
  - [ ] `AIタロット占い` 文字列の残骸なし
- [ ] サインイン + マーケティング LP の多言語化完了（タスク 5-7、#234 Phase 5）
  - [ ] `/auth/signin` が Accept-Language / cookie に応じて EN 表示
  - [ ] `[locale]/(marketing)/page.tsx` が `useTranslations` 経由で EN 文言を返す
  - [ ] `en.json` の `auth` / `marketing` namespace に NG ワード不使用で翻訳追加
  - [ ] Marketing URL は `ariadne-ai.app/` のまま（変更なし）
- [ ] `cd mobile && npx tsc --noEmit` クリーン — 各 PR で確認済み、Phase 5 マージ後に最終実施
- [ ] `cd web && npx tsc --noEmit && npm run build` クリーン — 各 PR で確認済み、Phase 5 マージ後に最終実施

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
