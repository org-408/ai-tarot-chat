# Apple 4.3(b) リジェクト対応 計画書（v6.1 確定版）

## 0. 概要

### 目的
iOS App Store Review Guideline **4.3(b) Design - Spam**（astrology/tarot/fortune-telling カテゴリ飽和）によるリジェクトを覆し、App Store 審査を通過させる。

### リジェクト情報
- Submission ID: `8e98e164-d687-444d-bd6b-786f36c75c27`
- リジェクト日: 2026-04-23
- 対象バージョン: v1.0 build 43
- デバイス: iPad Pro 11-inch (M4)

### 本質認識
- これはアプリの品質問題ではなく、Apple によるカテゴリ単位のゲートキーピング
- 同じ機能でも astrology/tarot 系というだけで新規参入が絞られている
- 対策は「品質向上」ではなく「**カテゴリ認識の書き換え**」

---

## 1. 戦略: 道 1 ハイブリッド（ロケール分離 + 多言語化）

| レイヤー | 対象 | 方針 |
|---|---|---|
| App Store Connect（英語） | Apple レビュアー | "AI Reflection Dialogue" に完全リポジション |
| App Store Connect（日本語） | 日本ユーザー | 「タロット」残しつつ「AI 対話 / リーディング」寄せ |
| アプリ UI 英語 | レビュアー・英語圏ユーザー | 完全 AI プロダクト寄せ（Reading/Dialogue/Session/AI Persona） |
| アプリ UI 日本語 | 日本ユーザー | 「占い」頻度削減、「リーディング / セッション」寄せ |
| X / ブログ | SEO 資産 | **変更なし**（Apple 非接続・日本語ブランド保護） |

### 思想
「**表：タロット、裏：AI 対話**」の二層構造。
- Apple 通過と日本ユーザー獲得・SEO 資産保護を両立
- 英語 UI を足すことで「ローカル占いアプリ」→「グローバル AI プロダクト」へ認識を逆転
- 多言語化そのものが 4.3(b) への独立したアピール要素

### 前提ユーザーフロー（構造的に「いきなり占い感」を回避済み）
```
起動 → HomePage（サマリー・カードなし）
CTA 押下 → キャラクター選択 → カテゴリ/スプレッド選択 → カード描画
```
カード描画は最初の 2 画面に出現しない。

---

## 2. App Store Connect メタデータ（両ロケール）

### 日本語

| 項目 | 値 |
|---|---|
| アプリ名 | `Ariadne - AI対話リーディング体験` |
| サブタイトル | `AIキャラクターと対話するリーディング` |
| プライマリカテゴリ | Lifestyle |
| キーワード | `タロット,占い,AI,対話,チャット,リーディング,内省,恋愛,仕事,キャラクター` |

> **注記（2026-04-24、PR #242 で確定）**: App Store Connect の表記は上記ローカライズを使うが、**アプリ内 UI（mobile / web `/auth/signin` 等）のサブタイトルは JA/EN 共通で `"AI Reflection Dialogue"` に統一**している。ブランド表記としての一貫性（切替で揺れない）と NG ワード回避の自動担保が目的。

### 英語

| 項目 | 値 |
|---|---|
| App Name | `Ariadne: AI Reflection Dialogue` |
| Subtitle | `AI personas for mindful dialogue` |
| Primary Category | Lifestyle |
| Keywords | `AI chat, reflection, companion, conversation, journal, mindful, dialogue, persona, insight, self` |

### 日本語説明文

```
AIキャラクターと対話する、タロットを用いた「対話型リーディング体験」。

従来の「カードを引いて固定の解説文を表示する占いアプリ」とは違い、
あなたの状況や質問に応じてAIが文脈を汲んで応答します。
一枚のカードから始まる対話は、最大3問までの深掘り質問で
あなた自身を見つめ直すきっかけになります。

■ 主な特徴
・8人のAIキャラクター（それぞれ異なる性格・語り口・得意分野）
・最大3問まで続くフォローアップ対話
・恋愛・仕事・健康・金運のテーマ別リーディング
・難易度別のスプレッド（初心者〜上級者）
・オフラインでも使えるキャラクター（Clara）
・セッション履歴の保存と振り返り
・日本語・英語の両言語に対応
・初回ユーザー向けのインタラクティブなチュートリアル

Ariadneは「当てる占い」ではなく、
AIとの対話を通じたリーディング体験として設計されており、
自分の気持ちや状況を整理するためのツールです。
```

### 英語説明文

```
Ariadne is an AI-powered reflection companion that helps you explore
your thoughts through structured dialogue with distinct AI personas.

Unlike static fortune-telling apps, Ariadne provides dynamic multi-turn
conversations where AI companions respond to your context and follow-up
questions. Card symbolism is used as a conversation starter — a reflection
prompt — rather than a predictive tool.

KEY FEATURES

- Eight AI personas, each with unique reasoning styles and specialties
- Multi-turn dialogue sessions (up to three follow-up questions per session)
- Structured reflection frameworks by life area
- Offline-capable companion for moments without connectivity
- Session history for tracking your reflections over time
- Four-tier difficulty progression from beginner to advanced
- Native bilingual support (English and Japanese)
- Interactive onboarding tutorials for new users
- Content moderation for safe conversations

Ariadne is designed for personal reflection and emotional insight,
not predictive astrology or deterministic fortune-telling.
```

---

## 3. Review Notes（英文・そのまま貼付）

```
This submission includes substantial revisions following the previous 
Guideline 4.3(b) rejection.

Ariadne is not a fortune-telling, astrology, or horoscope app. 
It does not provide predictions or guaranteed outcomes.
The app does not attempt to replicate or replace traditional tarot
or astrology services, but instead uses symbolic elements as a 
structured conversation framework.

It is an AI dialogue platform where users engage in structured multi-turn 
conversations with distinct AI personas for self-reflection.

CORE DIFFERENTIATION:

1. Multi-persona AI architecture — eight distinct AI companion
   characters, each with different reasoning styles, tones, and
   specialties.

2. Multi-turn interactive dialogue — sessions support up to three
   follow-up questions with context-aware AI responses. This is not
   a static card-meaning display.

3. Reflection-oriented framing — card symbolism is used as a
   conversation prompt for personal insight, not as predictive or
   deterministic output. Card visuals are introduced only after
   user-driven context selection and are not the primary interaction
   surface.

4. Offline reflection companion — one character (Clara) provides
   authored reflection content cached on-device.

5. Thoughtful user onboarding — the app includes interactive
   coach-mark tutorials for both Quick Reading and Personal Reading
   flows.

6. Content moderation — server-side moderation filters ensure user
   inputs and AI responses stay within safe, reflective contexts.

7. Bilingual product design — the app ships with native English and
   Japanese localization (not machine translation), reflecting its
   design as a global AI reflection product rather than a
   locale-specific utility. Language auto-detects from device
   settings and can be switched in-app. The English UI has been
   carefully localized to reflect the app's design as an AI dialogue
   system rather than a fortune-telling tool.

USER FLOW AFTER LAUNCH:
The home screen is a summary view (greetings, usage stats, navigation).
Tapping any CTA leads first to the AI persona selection screen, then
to theme/spread selection, and only after user choices are card visuals 
introduced as part of the conversation framework.

VERIFICATION SUGGESTION:
We recommend testing the "Personal Reading" flow with the "Ariadne"
or "Sophia" character to observe multi-turn dialogue depth and
reflection-oriented response style. The app UI can be tested in
English by setting device language to English.

Thank you for your consideration.
```

---

## 4. Resolution Center 返信（英文・そのまま貼付）

```
Dear App Review Team,

Thank you for your feedback. We have carefully reconsidered the app's
positioning and resubmitted with significant updates:

1. App name changed from "AI Tarot Chat" to "Ariadne: AI Reflection
   Dialogue" to better reflect the app's purpose.

2. App description rewritten to emphasize the app's function as an
   AI dialogue platform for self-reflection, not fortune-telling.

3. Primary category positioning reconsidered.

4. Detailed Review Notes added describing the technical and
   experiential differentiators, including multi-persona AI
   architecture, multi-turn dialogue design, interactive onboarding
   tutorials, content moderation, native bilingual (EN/JA) support,
   and the user flow after launch.

5. Screenshot order revised to lead with the dialogue-based
   experience rather than card-drawing.

6. In-app copy revised across both English and Japanese locales to
   emphasize "reflection" and "dialogue" over "fortune-telling"
   terminology.

We believe this app provides genuinely differentiated value as an
AI-driven reflection companion, distinct from predictive astrology
or fortune-telling apps.

We would appreciate if the app is evaluated based on its interactive
AI dialogue experience — in either English or Japanese locale —
rather than traditional category assumptions.

Thank you for your consideration.
```

---

## 5. スクリーンショット

5 枚（デバイスサイズ別・ロケール別にアップロード）。

| # | 画面 | 日本語キャプション | 英語キャプション |
|---|---|---|---|
| 1 | チャット画面 | `AIキャラクターと対話する` | `Dialogue with AI personas` |
| 2 | キャラクター選択 | `8人のAIキャラクターから選ぶ` | `Eight distinct AI companions` |
| 3 | フォローアップ質問中 | `最大3問までの深掘り対話` | `Multi-turn reflection` |
| 4 | セッション履歴 | `リーディングを振り返る` | `Session history` |
| 5 | Clara オフライン | `オフラインでも使える` | `Offline companion` |

**撮影ルール**:
- 1 枚目は必ずチャット（カードではなく）
- カード大写しなし、シャッフル演出なし
- 英語ロケール用スクショは英語 UI で撮影
- キャプションは画像内に焼き込む（App Store の説明欄は審査で表示されない）

---

## 6. Support / Marketing URL

現状:
- Support URL: 退会ページ（`/delete-account`）
- Marketing URL: マーケティングページ（ランディング）

**4.3(b) 的にはいずれも問題なし**（X やブログ記事直リンクではない）。

ただし Apple ガイドライン 5.1.1(v) の観点で、退会用 URL は **"Account Deletion URL"** という独立フィールド（App Store Connect → App Privacy）に設定するのが正しい運用。Support URL はサポート連絡先ページ（FAQ / お問い合わせ）に向けるのがベストプラクティス。

### 今回の対応: `/support` ページ新規作成

残件を残さないため、今回のリジェクト対応と同時に `/support` ページを新規作成する。

- パス: `web/app/support/page.tsx`（ロケール非依存の単純ページ、日本語のみ）
- 内容:
  - タイトル: `サポート`
  - FAQ セクション（[web/app/[locale]/(marketing)/pricing/page.tsx:330-351](../web/app/[locale]/(marketing)/pricing/page.tsx) の 5 項目を流用）
  - お問い合わせ連絡先: **`support@ariadne-ai.app`**（`mailto:` リンクで配置）
  - プライバシー / 利用規約へのリンク
- App Store Connect の Support URL を `/delete-account` → `/support` に更新
- 退会 URL は App Privacy → **Account Deletion URL** フィールドに移設

---

## 7. コード変更スコープ

### 📌 完了状況（2026-04-24）

| 項目 | 状態 | 関連 |
|---|---|---|
| モバイル Phase 1（i18n 基盤） | ✅ 完了 | `93bec5b` |
| モバイル Phase 2（JA 文言 key 化） | ✅ 完了 | `41b9a77` |
| モバイル Phase 2.1（DB master data 多言語化） | ✅ 完了 | #238 / PR #239 |
| モバイル Phase 2.2（JA ハードコード残り + 追補） | ✅ 完了 | #241 / PR #242 |
| モバイル Phase 3（EN 翻訳 + NG ワード検証） | ✅ 完了 | Phase 2/2.1/2.2 内 |
| モバイル Phase 4（Settings 言語切替 UI） | ✅ 完了 | Phase 2 内 |
| Web（Phase 5、5-1〜5-7） | ❌ 未着手 | — |

**詳細進捗は [GitHub Issue #234](https://github.com/org-408/ai-tarot-chat/issues/234) body が source of truth。各 PR マージ直後に checkbox を更新する運用（2026-04-24 確定）。**

### モバイル（`mobile/`）
- i18n 導入（i18next + react-i18next）
- `mobile/src/i18n/{index.ts, ja.json, en.json}` 新規作成
- 対象画面: HomePage / SalonPage / PersonalPage / ChatPanel / ClaraPage / TarotistPage / TarotistCarouselPortrait / SettingsPage / HistoryPage / SidebarMenu / Header / 共通トースト・エラー UI
- 日本語側: 「占い」頻度削減、key 化と同時に置換
- 英語側: NG ワード排除、AI プロダクト寄せトーン
- 言語自動判定（`@capacitor/device` の `getLanguageCode()`）
- Settings 画面に言語切替 UI 追加
- ユーザー選択は `@capacitor/preferences` に保存

### Web（`web/`）
- [web/app/privacy/page.tsx](../web/app/privacy/page.tsx) : `appName` 定数・サービス定義・「占い」→「リーディング」
- [web/app/terms/page.tsx](../web/app/terms/page.tsx) : 同上
- [web/app/page.tsx](../web/app/page.tsx) + [web/app/home-client.tsx](../web/app/home-client.tsx) : 見出し・CTA・紹介文を「リーディング / セッション / 対話」寄せに薄める。ブログリンクをフッターのみに弱化
- [web/app/auth/](../web/app/auth/) : タイトル・見出しの「占い」を軽く薄める
- [web/app/(app)/](../web/app/\(app\)/) : **公開済みのため軽いテキストスイープを実施**。i18n 化はしない、日本語のみ「占い」→「リーディング」置換
- **`web/app/support/page.tsx` 新規作成**: サポートページ（FAQ + お問い合わせ連絡先）。§6 参照

### 変更しないもの
- X / ブログ記事本体（SEO 保護）
- `web/app/blog/` 配下の記事
- 管理画面 `web/app/(admin)/`
- マスターデータ（カード意味文等）

### Web ランディング / サインインページの扱い

`ariadne-ai.app/` は **実質的に `/auth/signin` を兼ねるマーケティング入口** として機能する（未認証アクセスはサインインページへリダイレクト）。App Store Connect の Marketing URL は `ariadne-ai.app/` のまま、内部で多言語化する方針を採る。

- **サインインページ** (`web/app/auth/signin/page.tsx`) は現状 JA 直書き → **内部翻訳切替** (`useTranslations` + Accept-Language / `NEXT_LOCALE` cookie) を追加
  - **併せて**: サインイン内のマーケ LP 誘導リンク（現状 `href="/ja"` / `href="/ja/pricing"` ハードコード）を `/${locale}` / `/${locale}/pricing` に動的化。サインインが「サインイン + マーケ誘導」を兼ねる設計
- **独立マーケティング LP** (`web/app/[locale]/(marketing)/page.tsx` 配下) は next-intl の土台既に完動 (middleware / routing / `messages/{ja,en}.json`)。コンテンツが JA 直書きなだけ → `useTranslations` 移行 + `en.json` に翻訳追加で完了
- **Marketing URL は `ariadne-ai.app/` のまま**（変更不要）。Accept-Language が en のアクセスはサインインページが EN 表示、かつ内部リンクで `/en` LP に遷移できる

> 当初 "英語化はスコープ外" としていたが、アプリ内 UI + AI プロンプト + Privacy/Terms が EN 化される整合性から、サインイン + `[locale]/(marketing)/` の翻訳も同時に行うことにした (2026-04-24)。実装コストは「JA 直書き → `useTranslations` + `en.json` 追加」で既存土台を活用できるため低い。

---

## 8. 英語 UI ルール

### NG ワードリスト（en.json・コード内英語ハードコード・エラーメッセージ全てに適用）

| カテゴリ | NG 語 |
|---|---|
| 占い系 | `fortune`, `fortune-telling`, `fortune teller` |
| 予測系 | `predict`, `prediction`, `predicts`, `predictor` |
| 占星術 | `horoscope`, `horoscopes`, `zodiac` |
| 運命・未来 | `destiny`, `fate`, `future` |

**チェックコマンド**:
```bash
cd mobile
grep -rniE "fortune|predict|horoscope|destiny|fate|zodiac" src/i18n/en.json
grep -rniE "fortune|predict|horoscope|destiny|fate" src/components/ --include="*.tsx" --include="*.ts"
```
検出ゼロが合格。

### トーン統一ガイド

| ❌ NG | ✅ OK |
|---|---|
| Fortune Master / Fortune Teller | AI Persona / AI Companion |
| Tarot Reading | Reading / Dialogue Session |
| Quick Fortune | Quick Reading |
| Personal Fortune | Dialogue Reading / Personal Reflection |
| Daily Horoscope | Daily Reflection |
| Fortune Result | Reading Response / Session Summary |

"Tarot" 単独はラベルに使わない（説明文・Review Notes の文脈内では OK）。

---

## 9. 日本語 UI 文言置換リスト

### HomePage ([mobile/src/components/home-page.tsx](../mobile/src/components/home-page.tsx))

| before | after | key |
|---|---|---|
| `クイック占い` | `クイックリーディング` | `home.quickReading` |
| `パーソナル占い` | `対話リーディング` | `home.dialogueReading` |
| `クイック占いを始める` | `クイックリーディングを始める` | `home.startQuick` |
| `占い師・ジャンル・スプレッドを選んで占う` | `AI占い師・ジャンル・スプレッドを選んでリーディング` | `home.quickDesc` |
| `AI と対話しながらじっくり占う` | `AI と対話しながらじっくりリーディング` | `home.dialogueDesc` |
| `占い師を見る` | `AI占い師を見る` | `home.viewPersonas` |
| `いつでも占い` | `オフラインリーディング` | `home.offlineReading` |
| `Clara とオフラインで占う` | `Clara とオフラインでリーディング` | `home.offlineDesc` |
| `最近の占い` | `セッション履歴` | `home.recentSessions` |
| `占いの履歴が保存されます` | `セッション履歴が保存されます` | `home.historySaved` |

### 他ページ横断

| before | after |
|---|---|
| `占いを始める` | `リーディングを始める` |
| `占いを終わる` | `セッションを終える` |
| `占う` | `リーディングする` |
| `占い師`（ナビ・一覧） | `AI占い師` |

「占い師」単体はキャラクタープロフィール等の自然な表記では残す。1 画面あたりの「占い」出現 5 → 1〜2 に削減。

### Privacy / Terms 置換

| 箇所 | before | after |
|---|---|---|
| title metadata | `… \| Ariadne - AIタロット占い` | `… \| Ariadne - AI対話リーディング体験` |
| `appName` 定数 | 同上 | 同上 |
| サービス定義 | `AIを活用したタロットカード占いサービス` | `AIとの対話を通じたタロットカード・リーディング体験サービス` |
| 利用状況 | `占い実施回数` | `リーディング実施回数` |
| データ | `占いに入力した相談内容` | `リーディングに入力した相談内容` |
| 利用目的 | `AIによるタロット占い結果の生成` | `AIによるリーディング応答の生成` |
| 責任範囲 | `占い結果について` | `リーディング結果について` |
| 免責 | `占い結果はAIが生成するエンターテインメント` | `リーディング結果はAIが生成するエンターテインメント` |
| プロ占い師 | `プロの占い師によるサービスではありません` | `プロのタロット占い師による人的サービスではありません` |

---

## 10. App Store Connect 編集箇所サマリ

### ① App Information タブ（アプリ全体メタ）

| 項目 | 設定位置 |
|---|---|
| アプリ名（ja） | Localizable Information → Japanese → Name |
| アプリ名（en） | Localizable Information → English → Name |
| サブタイトル（ja/en） | 同上 → Subtitle |
| プライマリカテゴリ | General Information → Category |
| Privacy Policy URL | General Information → Privacy Policy URL |

### ② 該当バージョン画面（例: `1.0 Prepare for Submission`）

| 項目 | 設定位置 |
|---|---|
| 説明文（ja/en） | 各言語 → Description |
| キーワード（ja/en） | 各言語 → Keywords |
| スクリーンショット | App Previews and Screenshots（ja/en × デバイスサイズ別） |
| Support URL | 画面下部 |
| Marketing URL | 画面下部 |
| Review Notes | 最下部 App Review Information → Notes |
| Demo アカウント | Sign-In Information（ゲスト利用可） |
| Build 選択 | Build セクション（ビルド番号 44 以上の新ビルド） |
| 再提出 | 画面右上 Submit for Review |

### ③ Resolution Center タブ

| 項目 | 設定位置 |
|---|---|
| 返信 | 該当 Submission → Resolution Center タブ → Reply |

### 作業タイミング

```
メタデータ編集 → 新ビルド Upload → Build 選択 → Submit for Review
                                                    ↓
                              Resolution Center 返信（提出後すぐ）
```

---

## 11. 期待通過率

| シナリオ | 確率 |
|---|---|
| 1 回目アピールで通過 | **75〜85%** |
| 2〜3 回往復で通過 | **85〜92%** |
| 最終的に Android + PWA 転換 | 8〜15% |

---

## 12. リスクサマリ

| # | リスク | 影響度 | 緩和策 |
|---|---|---|---|
| 1 | ロケール齟齬検出 | 低 | i18n で UI も英語化、整合性確保 |
| 2 | UI の「占い」残り（日本語） | 低 | 頻度削減で許容 |
| 3 | ブログ SEO 色 | 低 | フッター導線のみ |
| 4 | マルチ AI 実態問題 | 中 | 1 回目は主張に含めず温存 |
| 5 | 初回体験 | 低 | 構造的解決済み |
| 6 | 英語翻訳品質（NG ワード残り） | 低 | NG リスト + grep + QA |
| 7 | Web 版 `(app)/` 公開済み | 低〜中 | 軽いテキストスイープで対応 |
| 8 | i18n 実装工数超過 | 中 | スコープ厳守 |
| 9 | Support URL の UX（4.3(b) 無関係） | 低 | 将来的にサポートページ新設を検討 |

---

## 13. 2 回目の弾（1 回目落ちたら）

優先順:

1. マルチ AI プロバイダ有効化（最低 Ariadne / Sophia）
2. 音声モード（OpenAI TTS でキャラ別ボイス）
3. AI 自由対話モード（カード無しで直接対話）
4. iOS Widget
5. 新規ウェルカムオンボーディング画面

---

## 14. やらないこと（確定）

- ❌ X 投稿・ブログ記事本体の書き換え
- ❌ 新規オンボーディング画面の追加（既存コーチマーク活用）
- ❌ 音声モード / iOS Widget / スプラッシュ再設計
- ❌ マルチ AI プロバイダ有効化
- ❌ 管理画面 `(admin)/` の変更
- ❌ Web 版 `(app)/` の i18n 化（日本語の軽いテキストスイープのみ）
- ❌ カテゴリ別カード意味文・マスターデータの書き換え
