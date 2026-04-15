# Web版開発ガイド

## 目的・背景

パーソナル占いは入力量が多く（テーマ・スプレッド選択・質問3回）、モバイルより Web の方が UX が優れている。**新規顧客獲得**を目的に Web 版を開発する。

- **モバイル**: クイック占いのカジュアルユース
- **Web**: パーソナル占いをじっくり使うユース

---

## 課金方針

**Stripe 直接**（RevenueCat Web SDK は使わない）

- 手数料: Stripe ~3.2% vs App Store/Google Play 30%
- RevenueCat との差も ~1% 程度なので直接の方がシンプル
- Stripe 統合 API ルート:
  - `POST /api/stripe/checkout` — チェックアウトセッション作成
  - `POST /api/stripe/webhook` — イベント受信・プラン状態更新
  - `POST /api/stripe/portal` — 顧客ポータル（解約・請求管理、returnUrl をボディで渡すため POST）

---

## タロティスト選択ルール（重要仕様）

| 占い種別 | 選択できる占い師 |
|---|---|
| クイック占い | 全タロティスト |
| パーソナル占い | `Tarotist.plan.code === "PREMIUM"` のみ |

`TarotistSelector` コンポーネントには `premiumOnly?: boolean` prop を設け、呼び出し元で制御する。

---

## 実装フェーズ

### Phase 1 — shared コンポーネント層の確立

**モバイルのコードには一切手を加えない。**

- `/shared/components/` と `/shared/hooks/` を新規作成
- shared に新規でコンポーネントを作り込む（モバイルからのコピーではなく新規実装）
- モバイルは動き続ける
- 設定変更は最小限（Tailwind content・tsconfig paths のみ）

### Phase 2 — Web 実装

- Web ページを `/web/app/[locale]/(app)/` に実装
- shared コンポーネント + Web 固有サービス層を組み合わせる
- Stripe 統合

### Phase 3 — 任意（後から）

- モバイル側も shared コンポーネントを使うよう差し替え
- Web が安定してから実施

---

## ディレクトリ構成

```
shared/
  components/
    chat/         ChatView, MessageBubble, MessageContent, ChatInput
    tarot/        SpreadViewer, TarotCard, CardReveal, UpperViewer, LowerViewer
    reading/      RevealPromptPanel, CategorySpreadSelector,
                  TarotistSelector(premiumOnly対応), ShuffleDialog
    ui/           Accordion, ScrollableRadioSelector
  hooks/
    use-chat-session.ts   ← SSE + セッション管理（プラットフォーム非依存）
    use-tarot-draw.ts
  lib/
    types.ts              ← 既存

web/
  app/
    [locale]/
      (app)/              ← 認証済みユーザー全般
        salon/            → /ja/salon
        reading/          → /ja/reading
        personal/         → /ja/personal
        history/          → /ja/history
        tarotists/        → /ja/tarotists
        settings/         → /ja/settings
        plans/            → /ja/plans
      (marketing)/        ← 既存 LP・料金ページ
    auth/                 ← 既存 + Web用サインインUI新規作成
  lib/
    client/
      stores/             ← Zustand（Cookie/localStorageベース）
      services/           ← fetchベース（Capacitorなし）
      stripe/             ← Stripe連携
  messages/
    ja.json               ← 翻訳マスター（Claude が開発時に同時更新）
    en.json               ← DeepLスクリプト生成
    zh.json
    ko.json

scripts/
  translate.ts            ← 不足キーを検出→DeepL→JSON更新
  translate-master.ts     ← DBコンテンツ（カード意味等）を翻訳
```

---

## 命名規則

プロジェクト全体の既存規則に合わせる。

| 対象 | 規則 | 例 |
|---|---|---|
| ファイル名 | kebab-case | `chat-view.tsx`, `use-chat-session.ts` |
| コンポーネント名 | PascalCase | `ChatView`, `TarotistSelector` |
| 変数・関数名 | camelCase | `premiumOnly`, `handleSend` |
| i18n キー | camelCase | `endReading`, `questionsRemaining` |
| i18n namespace | camelCase 単語 | `chat`, `reading`, `tarotist` |

---

## Phase 1 セットアップ

**パスエイリアス方式**（shared 側にビルド設定・package.json 不要）

```typescript
// mobile/tsconfig.json と web/tsconfig.json に追加
"paths": { "@shared/*": ["../../shared/*"] }
```

```typescript
// mobile/tailwind.config.ts と web/tailwind.config.ts に追加
content: ["../../shared/components/**/*.{ts,tsx}", ...]
```

---

## ChatPanel のパーツ化

### 分割構造

```
ChatView（shared/components/chat/）
  - 純粋な表示コンポーネント。@ai-sdk/react 依存ゼロ
  - Props: messages, status, inputValue, onInputChange, onSend,
           onClose?, phase2Stage?, questionsRemaining?,
           showCloseButton?, keyboardOffset?
  - 内包: MessageBubble, MessageContent, ChatInput

useChatSession（shared/hooks/）
  - useChat（SSE + JWT リフレッシュリトライ）
  - Phase2 ステートマシン（chatting → saving → done）
  - handleSessionClose + isEndingEarlyRef（tearing 防止ガード）
  - buildPersistSignature（重複保存防止）
  - プラットフォームアダプター注入口
  - Returns: { messages, send, close, phase2Stage, isStreaming, inputDisabled, ... }

// プラットフォームアダプターインターフェース
interface ChatSessionAdapters {
  useKeyboardHeight?: () => number
  useAppStateCallback?: (cb: () => void) => void
}
```

### プラットフォーム別実装

| | Mobile | Web |
|---|---|---|
| `useKeyboardHeight` | Capacitor Keyboard | `visualViewport` API |
| `useAppStateCallback` | `CapacitorApp.addListener` | `visibilitychange` イベント |

```
ChatPanel（mobile）= useChatSession + Capacitorアダプター + ChatView
ChatPanel（web）   = useChatSession + Webアダプター + ChatView
```

---

## OAuth サインイン

- **バックエンド共通**: 既存 NextAuth.js + Google/Apple をそのまま使用
- **Web UI は新規作成**: モバイル用のカード・スワイプ UI は使わない。シンプルな Web デザイン
- モバイルのチケット交換フロー（`/api/auth/ticket` → `/api/auth/exchange`）は mobile 固有のまま維持

---

## 多言語化（i18n）

### 方針

- ライブラリ: **`next-intl`**（App Router ベストプラクティス）
- **DeepL はランタイムに使わない**。翻訳生成スクリプト（`scripts/translate.ts`）としてのみ使用
- `ja.json` がマスター。辞書が育ちきったら DeepL API キー不要。本番に DeepL 依存ゼロ
- shared コンポーネントは i18n ライブラリ非依存（文字列は props で受け取る）

### DeepL スクリプトの動作

```typescript
// scripts/translate.ts
// ja.json（マスター）と他言語ファイルを比較
// → 不足キーのみ DeepL に投げる
// → 結果を各言語ファイルに追記
// → 全キー揃ったら「DeepL 不要」で終了
```

### 対応言語

- 初期: **`ja`**（マスター）・**`en`** のみ
- 追加言語（`zh`, `ko` 等）は後から `scripts/translate.ts` で生成

### 翻訳キー命名規則

- ネスト **2階層まで**: `namespace.key`
- **namespace**: `common` / `nav` / `chat` / `reading` / `salon` / `personal` / `tarotist` / `history` / `auth` / `plans` / `settings`
- **camelCase**（命名規則セクション参照）
- 変数は `{variable}` 形式（`{{variable}}` は Turbopack で動作しない）

```json
{
  "common": {
    "send": "送信",
    "back": "戻る",
    "close": "閉じる",
    "loading": "読み込み中..."
  },
  "chat": {
    "placeholder": "メッセージを入力...",
    "endReading": "占いを終わる",
    "questionsRemaining": "残り{{count}}問"
  },
  "reading": {
    "shufflePrompt": "カードをシャッフルしてください",
    "startPersonal": "パーソナル占いを始める"
  },
  "salon": {
    "selectType": "占いの種類を選んでください"
  },
  "tarotist": {
    "premiumOnly": "プレミアム占い師"
  }
}
```

### Claude の作業ルール

**Web 版のコンポーネント・ページを実装する際は、UIテキストを書いたターンで必ず `web/messages/ja.json` を同時更新する。後回し禁止・漏れ禁止。**
