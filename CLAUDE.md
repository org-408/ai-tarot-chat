# AI Tarot Chat - Claude Code ガイド

## プロジェクト概要

AI を活用したタロットリーディング SaaS プラットフォーム。複数プラットフォーム（Web / モバイル / デスクトップ）対応、複数の AI プロバイダを使い分けるマルチプロバイダ構成。

### 主要技術スタック

| レイヤー | 技術 |
|---|---|
| Web BFF | Next.js 16 (App Router + Turbopack) |
| モバイル | Capacitor 8 + React + Vite + Ionic |
| デスクトップ | Tauri 2 (Rust) + React + Vite |
| DB | PostgreSQL + Prisma ORM |
| 認証 | NextAuth.js 5 (Auth.js) + OAuth (Google / Apple) |
| AI SDK | Vercel AI SDK (`ai` パッケージ) |
| 状態管理 | Zustand + TanStack React Query |
| UI | Tailwind CSS 4 + Shadcn/ui (Radix UI) |

---

## ディレクトリ構成

```
/
├── web/                  # Next.js BFF サーバー (メインバックエンド)
├── mobile/               # Capacitor モバイルアプリ (iOS / Android)
├── src/                  # Tauri デスクトップフロントエンド
├── src-tauri/            # Tauri デスクトップ Rust バックエンド
├── shared/               # 共有型定義 (shared/lib/types.ts)
├── docs/                 # ドキュメント・マスターデータ CSV など
├── public/               # 静的アセット
├── scripts/              # ユーティリティスクリプト
└── compose.yml           # Docker Compose (PostgreSQL)
```

---

## Web アプリ (`/web`)

### ディレクトリ構成

```
web/
├── app/
│   ├── api/              # API ルート (Route Handlers)
│   │   ├── auth/         # NextAuth.js + カスタム認証
│   │   ├── clients/      # クライアント管理 (使用量・リーディング保存)
│   │   ├── device/       # デバイス登録・リセット
│   │   ├── logger/       # クライアントからのログ受信
│   │   ├── masters/      # マスターデータ配信
│   │   ├── oauth/        # OAuth トークン交換
│   │   ├── plans/        # プラン一覧
│   │   ├── readings/     # リーディング API (simple / personal)
│   │   ├── reset/        # アプリリセット
│   │   ├── spread-cells/ # スプレッドセル詳細
│   │   ├── spread-levels/# スプレッドレベル
│   │   └── spreads/      # スプレッド一覧・詳細
│   ├── (admin)/          # 管理者ページ群
│   ├── auth/             # 認証ページ
│   ├── privacy/          # プライバシーポリシー
│   └── terms/            # 利用規約
├── lib/
│   ├── server/
│   │   ├── ai/           # AI プロバイダ設定 (models.ts)
│   │   ├── repositories/ # データアクセス層 (Prisma)
│   │   ├── services/     # ビジネスロジック層
│   │   ├── logger/       # Winston ロガー
│   │   └── validators/   # 入力バリデーション
│   └── utils/            # クライアントサイドユーティリティ
├── components/
│   ├── admin/            # 管理画面コンポーネント
│   ├── auth/             # 認証コンポーネント
│   ├── providers/        # React Context プロバイダ
│   ├── spreads/          # スプレッド表示コンポーネント
│   └── ui/               # Shadcn/ui ベースコンポーネント
├── prisma/
│   ├── schema.prisma     # DB スキーマ定義
│   ├── seed.ts           # 初期データ投入
│   └── generate-master.ts# マスターデータ生成
├── types/                # TypeScript 型定義 (Web 専用)
├── auth.ts               # NextAuth.js 設定
└── middleware.ts         # CORS + 認証ミドルウェア
```

### npm スクリプト (web/)

```bash
npm run dev          # 開発サーバー起動 (Turbopack)
npm run build        # プロダクションビルド
npm run db:migrate   # マイグレーション実行
npm run db:reset     # DB リセット
npm run db:seed      # 初期データ + マスターデータ投入
npm run db:master    # マスターデータのみ再生成
npm run db:studio    # Prisma Studio 起動
npm run ui:add       # Shadcn コンポーネント追加
```

---

## AI プロバイダ設定 (`web/lib/server/ai/models.ts`)

### プロバイダ種別

| 定数名 | 用途 |
|---|---|
| `providers` | 有料ユーザー向け (OpenAI, Google Vertex AI, Anthropic) |
| `freeProviders` | 無料ユーザー向け (Groq, Cerebras, DeepInfra, Mistral) |
| `homeProviders` | ホームサーバー (ariadne-llm.com, Ollama) 経由 |
| `homeFreeProviders` | ホームサーバー経由の無料プロバイダ代替 |

### Tarotist とモデルのマッピング

DB の `Tarotist` テーブルの `model` カラムが `providers` のキー（例: `claude_s`, `gpt41`）に対応。`provider` カラムでホームサーバー使用か判断。

### 無料プロバイダの選択ロジック

`selectProvider()` 関数が `ratio` プロパティに基づき加重ランダム選択。

---

## データベーススキーマ (`web/prisma/schema.prisma`)

### 主要モデル

```
User          # Auth.js 標準ユーザー (OAuth 連携)
Account       # OAuth プロバイダアカウント
Session       # NextAuth.js セッション
Device        # デバイス識別 (UUID、ゲストユーザーの識別に使用)
Client        # アプリ内ユーザー (プラン・利用量を持つ)
Plan          # サブスクリプションプラン (GUEST / FREE / STANDARD / PREMIUM)

TarotDeck     # タロットデッキ (言語別)
TarotCard     # タロットカード (78枚)
CardMeaning   # カテゴリ別カード意味

SpreadLevel   # スプレッド難易度 (BEGINNER / MEDIUM / ADVANCED / EXPERT)
Spread        # スプレッド定義
SpreadCell    # スプレッド内のカード配置
ReadingCategory # リーディングカテゴリ (恋愛・仕事・総合など)

Tarotist      # AI 占い師キャラクター (名前・特性・使用AIモデル)
Reading       # リーディングセッション
DrawnCard     # 引いたカード (逆位置・キーワード含む)
ChatMessage   # チャット履歴 (ChatType / ChatRole 列挙型)

FavoriteSpread       # お気に入りスプレッド
MasterConfig         # マスターデータバージョン管理
DailyResetHistory    # 日次利用量リセット履歴
PlanChangeHistory    # プラン変更履歴
Log                  # アプリケーションログ
UsedTicket           # ワンタイム認証チケット
```

### 重要な設計ルール

- **`Client` と `User` は別物**: `User` は OAuth 認証用、`Client` はアプリのビジネスロジック用
- **ゲストユーザーは `Device` で識別**: `Client.userId` が null のケースがゲスト
- **ソフトデリート**: `Client.deletedAt` で管理
- **多言語対応**: `TarotDeck`, `TarotCard`, `CardMeaning` は `language` フィールドで管理

---

## 認証フロー

```
1. OAuth Login (Google / Apple)
   └─ NextAuth.js → User + Account レコード作成

2. JWT 発行
   └─ auth.ts のコールバック → clientId / deviceId を JWT に含める

3. モバイル向けチケット認証
   └─ POST /api/auth/ticket → ワンタイムチケット発行
   └─ POST /api/auth/exchange → チケットと JWT を交換

4. デバイス登録
   └─ POST /api/device/register → Device レコード作成・更新
```

### ミドルウェア (`middleware.ts`)

- CORS ヘッダー設定 (モバイルアプリ対応)
- OPTIONS メソッドのプリフライト対応
- Next.js 16 向けリクエストヘッダー転送

---

## モバイルアプリ (`/mobile`)

### 技術詳細

- **Capacitor 8** + iOS / Android ネイティブシェル
- **Ionic React** UI コンポーネント
- **RevenueCat** サブスクリプション管理
- **AdMob** 広告
- **Capacitor SQLite** ローカルストレージ
- アプリ ID: `com.atelierflowlab.aitarotchat`

### 重要な注意事項

`CapacitorHttp.enabled: false` に固定すること。`true` にすると `window.fetch()` がネイティブ HTTP に置換され、SSE ストリーミング（useChat）が `React error #185` で中断される。HTTP の認証は `http.ts` で `window.fetch()` + Authorization ヘッダーで対応。

### ディレクトリ構成

```
mobile/src/
├── components/       # UI コンポーネント
├── lib/
│   ├── services/     # API 呼び出し・ビジネスロジック
│   ├── repositories/ # ローカルデータアクセス
│   ├── stores/       # Zustand ストア
│   ├── hooks/        # カスタムフック
│   ├── plugins/      # Capacitor プラグインラッパー
│   └── logger/       # ロガー
└── types/            # TypeScript 型定義
```

### npm スクリプト (mobile/)

```bash
npm run dev          # Web ブラウザで開発
npm run build        # ビルド
npx cap sync         # ネイティブプロジェクトと同期
npx cap open ios     # Xcode で開く
npx cap open android # Android Studio で開く
```

---

## デスクトップアプリ (`/src`, `/src-tauri`)

- **Tauri 2** (Rust バックエンド)
- フロントエンドは `/src` (React + Vite + TypeScript)
- プラグイン: `@tauri-apps/plugin-http`, `plugin-sql`, `plugin-store`

### npm スクリプト (ルート)

```bash
npm run dev          # Tauri 開発モード
npm run build        # Tauri プロダクションビルド
```

---

## 共有型定義 (`/shared/lib/types.ts`)

モバイル・Web で共有する型。`web/node_modules/@prisma/client` から `ChatRole`, `ChatType` 列挙型をインポート。

主な型: `User`, `Client`, `Device`, `Reading`, `DrawnCard`, `ChatMessage`, `TarotCard`, `Spread`, `SpreadCell`, `Tarotist`, `Plan` など

---

## インフラ・環境

### Docker Compose (`compose.yml`)

```bash
docker compose up -d   # PostgreSQL 起動
```

PostgreSQL コンテナ: `postgres` (ポートは環境変数 `DB_PORT` で制御)

### 必要な環境変数 (web/.env.local)

```
DATABASE_URL                  # PostgreSQL 接続 URL
NEXTAUTH_SECRET               # NextAuth.js シークレット
AUTH_GOOGLE_ID                # Google OAuth クライアント ID
AUTH_GOOGLE_SECRET            # Google OAuth シークレット
ARIADNE_API_KEY               # ホームサーバー API キー
GOOGLE_VERTEX_PROJECT         # Google Vertex AI プロジェクト
GOOGLE_VERTEX_LOCATION        # Google Vertex AI リージョン
GOOGLE_CLIENT_EMAIL           # Google サービスアカウント
GOOGLE_PRIVATE_KEY            # Google 秘密鍵 (\n は実際の改行に変換必要)
OPENAI_API_KEY                # OpenAI
ANTHROPIC_API_KEY             # Anthropic Claude
GROQ_API_KEY                  # Groq
CEREBRAS_API_KEY              # Cerebras
DEEPINFRA_API_KEY             # DeepInfra
MISTRAL_API_KEY               # Mistral
```

---

## アーキテクチャの重要パターン

### サービス層 / リポジトリ層

- `web/lib/server/services/` : ビジネスロジック (Prisma を直接触らない)
- `web/lib/server/repositories/` : Prisma データアクセス (DB への直接操作)
- API Route Handler → Service → Repository の順で呼び出す

### マスターデータ管理

- `MasterConfig` テーブルでバージョン管理
- モバイルは起動時に `GET /api/masters/check-update` でバージョン確認
- 変更時は `npm run db:master` でデータ再生成 → バージョンインクリメント

### 利用量制限

- `Client.dailyReadingsCount`（クイック占い）, `dailyPersonalCount`（パーソナル占い）で管理
- 日付変更時に `DailyResetHistory` を記録してリセット
- プランごとに上限が異なる

---

## ドキュメント (`/docs`)

| ファイル | 内容 |
|---|---|
| `ai_models_cost_sorted.md` | AI モデルコスト比較 |
| `tarot_ai_cost_analysis_v3.md` | コスト詳細分析 |
| `tarot_spread_matrix.md` | スプレッド一覧・配置定義 |
| `tarot_ai_prompt_design.md` | AI プロンプト設計 |
| `reset-app-guide.md` | データリセット手順 |
| `master-version.md` | マスターデータバージョン戦略 |
| `tarot_data_dictionary_*.json` | タロットカードデータ (英語・日本語) |
| `*.csv` | プラン・スプレッド・レベル定義 CSV |

---

## 開発時の注意点

1. **`GOOGLE_PRIVATE_KEY` の改行**: `.env` 内の `\n` が文字列として入ることがあるため `models.ts` で `.replace(/\\n/g, "\n")` している
2. **Next.js 16 ヘッダー転送**: `middleware.ts` で明示的にリクエストヘッダーを転送しないと Route Handler に届かないケースがある
3. **SSE ストリーミング**: モバイルでは `CapacitorHttp.enabled: false` を維持、ネイティブ HTTP に置き換えると壊れる
4. **ゲストユーザー**: `Client.userId` が null のため、認証前提のクエリには注意
5. **プラン制限**: スプレッドにも `planId` があり、プランに応じてアクセス可否が変わる

---

## `mobile/src/assets/master-data.ts` の運用

`master-data.ts` は各環境の DB から生成される自動生成ファイルで、**TarotCard の `id`（DB の cuid）が環境ごとに異なる**。モバイルアプリは `DrawnCard.cardId` として `card.id` を使用するため、ビルド対象環境の DB から生成したファイルをリポジトリに含める必要がある。

### 環境別の生成手順

```bash
cd web

# staging 向けビルド前
npm run db:master:staging    # web/.env.staging の DATABASE_URL を使って生成
# または
DATABASE_URL=<staging の接続URL> npm run db:master

# production 向けビルド前
npm run db:master:production  # web/.env.production の DATABASE_URL を使って生成
```

### 注意事項

- `master-data.ts` は `main` ブランチと `staging` ブランチで内容が異なることがある（正常）
- DB リセット（`db:reset+`）後は必ず `db:master` を再実行して `master-data.ts` を更新すること
- マスターデータ（TarotCard 等）を変更した場合も同様に再実行が必要
