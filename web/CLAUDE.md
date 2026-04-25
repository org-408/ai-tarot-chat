# Web (Next.js BFF) - Claude Code ガイド

## 概要

`/web` は Next.js 16 製の BFF（Backend For Frontend）サーバー。モバイル・デスクトップアプリへの API 提供と管理画面を担う。

## 開発コマンド

```bash
npm run dev          # 開発サーバー (Turbopack, http://localhost:3000)
npm run build        # プロダクションビルド
npm run lint         # ESLint

# DB 操作
npm run db:migrate   # マイグレーション実行
npm run db:reset     # DB リセット (データ消去)
npm run db:reset+    # DB リセット + マイグレーション
npm run db:push      # スキーマをそのまま DB へ Push (マイグレーション無し)
npm run db:studio    # Prisma Studio (http://localhost:5555)
npm run db:seed      # 初期データ + マスターデータ投入
npm run db:master    # マスターデータのみ再生成
npm run db:generate  # Prisma クライアント再生成

# カード画像 (X 自動投稿用の逆位置画像)
npm run cards:reversed              # 差分生成 (入力より古い出力のみ再生成)
npm run cards:reversed -- --force   # 強制上書き

# UI コンポーネント追加
npm run ui:add <component-name>
```

### カード画像を追加した場合の手順

新しいタロットカード画像を `mobile/public/cards/` に追加したら、X 投稿に添付する逆位置版（180° 回転済み PNG）を `mobile/public/cards-reversed/` に生成する必要がある。

```bash
cd web
npm run cards:reversed    # 不足分だけ自動生成（既存より新しい入力も再生成）
```

- `cards/` と `cards-reversed/` は `web/public/` からシンボリックリンクされているため、Web 側の変更は不要
- 既存のモバイル・Web のスプレッド表示は CSS `rotate-180` で表示するため `cards/` のみ使用。`cards-reversed/` は X 投稿の media upload 専用（Twitter API は CSS 変換を反映しないため物理回転画像が必要）
- 逆位置画像は必ずリポジトリにコミットする（sharp をランタイムに呼ばない方針）

## API ルート一覧

### 認証系 (`app/api/auth/`)

| メソッド | パス | 説明 |
|---|---|---|
| ALL | `/api/auth/[...nextauth]` | NextAuth.js ハンドラー |
| POST | `/api/auth/exchange` | チケット → JWT 交換 |
| POST | `/api/auth/refresh` | セッション更新 |
| POST | `/api/auth/signout` | サインアウト |
| POST | `/api/auth/cleanup` | セッション削除 |
| POST | `/api/auth/ticket` | ワンタイムチケット発行 |

### クライアント系 (`app/api/clients/`)

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/clients/usage` | 利用状況取得 |
| POST | `/api/clients/readings` | リーディング結果保存 |
| POST | `/api/clients/plan/change` | プラン変更 |

### マスターデータ系

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/masters` | 全マスターデータ取得 |
| GET | `/api/masters/check-update` | バージョン確認 |
| GET | `/api/plans` | プラン一覧 |
| GET | `/api/spread-levels` | スプレッドレベル一覧 |
| GET | `/api/spreads` | スプレッド一覧 |
| GET | `/api/spreads/[id]` | スプレッド詳細 |
| GET | `/api/spreads/[id]/cells` | スプレッドセル一覧 |
| GET | `/api/spread-cells/[id]` | セル詳細 |

### リーディング系

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/readings/simple` | シンプルリーディング (AI なし) |
| POST | `/api/readings/personal` | AI リーディング (ストリーミング) |

### デバイス系

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/device/register` | デバイス登録・更新 |

### その他

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/logger` | クライアントログ受信 |
| POST | `/api/reset` | アプリ状態リセット |

## サービス層 (`lib/server/services/`)

各サービスはリポジトリ層を使ってデータアクセスを行う。

| ファイル | 主な責務 |
|---|---|
| `auth.ts` | JWT 検証・発行、チケット管理、OAuth |
| `client.ts` | クライアント取得・作成、利用量チェック・更新 |
| `reading.ts` | リーディング作成・取得 |
| `tarotist.ts` | 占い師キャラクター取得 |
| `spread.ts` | スプレッド・セル取得 |
| `tarot.ts` | タロットカード取得 |
| `plan.ts` | プラン取得・変更 |
| `master.ts` | マスターデータ集約・バージョン管理 |
| `moderation.ts` | コンテンツモデレーション |
| `log.ts` | ログ保存 |
| `seed.ts` | 開発用シードデータ |

## リポジトリ層 (`lib/server/repositories/`)

| ファイル | 主な責務 |
|---|---|
| `client.ts` | Client CRUD |
| `reading.ts` | Reading / DrawnCard CRUD |
| `tarotist.ts` | Tarotist 取得 |
| `spread.ts` | Spread / SpreadCell 取得 |
| `tarot.ts` | TarotCard / TarotDeck 取得 |
| `plan.ts` | Plan / PlanChangeHistory 操作 |
| `master.ts` | MasterConfig 操作 |
| `favorite.ts` | FavoriteSpread CRUD |
| `auth.ts` | UsedTicket 管理 |
| `chat.ts` | ChatMessage CRUD |
| `log.ts` | Log 保存 |
| `database.ts` | Prisma クライアントシングルトン |
| `base.ts` | 基底クラス・共通ユーティリティ |

## AI モデル設定 (`lib/server/ai/models.ts`)

### Tarotist モデルキー

`Tarotist.model` カラムが以下のキーに対応:

```
gpt5nano  → OpenAI gpt-5-nano (有料) / Mistral mistral-small-latest (無料)
gemini25  → Vertex gemini-2.5-flash (有料) / Mistral mistral-small-latest (無料)
gemini25pro → Vertex gemini-2.5-pro (有料) / Google gemini-2.5-flash-lite (無料)
claude_h  → Anthropic claude-haiku-4-5 (有料) / Groq llama-3.3-70b-versatile (無料)
gpt41     → OpenAI gpt-4.1 (有料) / Google gemini-2.5-flash (無料)
gpt5      → OpenAI gpt-5 (有料) / Groq openai/gpt-oss-120b (無料)
claude_s  → Anthropic claude-sonnet-4-5 (有料) / Groq openai/gpt-oss-120b (無料)
google    → Google gemini-2.5-pro (有料) / Ollama gemma3:12b (無料)
```

### ホームサーバー (`homeProviders` / `homeFreeProviders`)

`Tarotist.provider` が `"home"` のとき使用。`ariadne-llm.com` 経由の Ollama + カスタムモデル。

### `maxDuration = 60`

Render.com のタイムアウト対策で 60 秒に設定。

## 認証設定 (`auth.ts`)

- プロバイダ: Google OAuth, Apple Sign In
- セッション戦略: JWT (maxAge 30 日)
- JWT ペイロードに含む追加フィールド:
  - `deviceId`: デバイス UUID
  - `clientId`: Client テーブルの ID
  - `provider`: "google" / "apple"
- Cookie: `sameSite: "none"`, `secure: true` (モバイルアプリからのリクエスト対応)

## ミドルウェア (`proxy.ts`)

- **CORS 設定**: オリジン反射型 (`Access-Control-Allow-Origin: <request-origin>`)
- **ヘッダー転送**: Next.js 16 バグ回避のため明示的にコピー
- **OPTIONS**: 204 で即返却
- **除外パス**: `_next/static`, `_next/image`, `favicon.ico`, `privacy`, `terms`

## 環境変数

```bash
# DB
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"

# NextAuth.js
NEXTAUTH_SECRET="..."
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
AUTH_APPLE_ID="..."               # Apple Sign In (Service ID)
AUTH_APPLE_TEAM_ID="..."          # Apple Developer Team ID
AUTH_APPLE_KEY_ID="..."           # Sign in with Apple Key ID (.p8 に対応)
AUTH_APPLE_PRIVATE_KEY="..."      # .p8 の中身 (\n はそのまま書く)

# AI プロバイダ
OPENAI_API_KEY="..."
ANTHROPIC_API_KEY="..."
GROQ_API_KEY="..."
CEREBRAS_API_KEY="..."
DEEPINFRA_API_KEY="..."
MISTRAL_API_KEY="..."

# Google Vertex AI
GOOGLE_VERTEX_PROJECT="..."
GOOGLE_VERTEX_LOCATION="asia-northeast1"   # または us-central1
GOOGLE_CLIENT_EMAIL="...@....iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."   # \n はそのまま書く

# ホームサーバー
ARIADNE_API_KEY="..."
```

> **注意**: `GOOGLE_PRIVATE_KEY` の `\n` は `.env` ファイル内では `\\n` 表記になる場合があり、コード内で `.replace(/\\n/g, "\n")` で変換している。

## DB マイグレーションの流れ

```bash
# 1. スキーマ変更後
cd web
npm run db:migrate    # マイグレーションファイル生成 + 適用

# 2. マスターデータ変更後
npm run db:master     # マスターデータ再生成 (MasterConfig バージョン更新)

# 3. 開発環境リセット
npm run db:reset+     # DB 全消去 → マイグレーション → シード
```

## コンポーネント追加 (Shadcn/ui)

```bash
npm run ui:add button
npm run ui:add dialog
npm run ui:add select
```

コンポーネントは `components/ui/` に生成される。
