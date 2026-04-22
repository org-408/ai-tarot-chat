# BlogFeatureQueue 自動生成・管理画面タスク

## 背景・目的

`web/lib/server/services/blog-post.ts` の `generateBuildInPublicContent()` は `BlogFeatureQueue` テーブルから
「次の PENDING な機能説明」を取得してブログ記事を生成する。

このキューが空だと機能紹介ブログが生成されない。

**やること（2つ）:**
1. コードベースを解析して機能一覧を洗い出し、`web/scripts/seed-feature-queue.ts` を作成する
2. 管理画面でキューの確認・追加・編集・並び替えができるUIを実装する

---

## 対象コードベース

```
/Users/m_shioya/GitHub/ai-tarot-chat/
├── web/app/api/              # API エンドポイント（機能の実体）
├── web/app/(admin)/          # 管理画面（ここにUIを追加）
├── web/lib/server/services/  # ビジネスロジック
├── mobile/src/               # モバイルアプリ（ユーザー向け機能）
└── web/prisma/schema.prisma  # DBスキーマ（機能の構造を読む）
```

---

## タスク1: 機能一覧シードスクリプト

### 洗い出しの観点

**対象**: エンドユーザーが実際に使える・体験できる機能
- タロット占い（クイック・パーソナル）
- スプレッド種類（1枚引き・3枚・ケルト十字など）
- AI 占い師キャラクター選択
- 占い履歴
- お気に入りスプレッド
- プラン・サブスクリプション
- Web版での利用
- など

**除外**: インフラ・開発者向け・内部実装（DB マイグレーション、CI/CD、管理画面機能、ロギング等）

### `description` フィールドの書き方

`generateBuildInPublicContent()` がこの `description` を受け取って Claude に渡しブログ記事を生成する。

- ユーザー目線で「何ができるか」を1〜2文で説明
- 技術用語を使わない
- 例: `「今日の一枚」機能 — 毎朝AIがタロットカードを1枚引いて、その日のメッセージをお届けします`
- 例: `パーソナル占い — 悩みや状況を詳しく入力すると、AIがあなただけのタロットリーディングを行います`

### スクリプト実装

`web/scripts/seed-feature-queue.ts` を新規作成:

```typescript
import { PrismaClient, FeatureQueueStatus } from "../lib/generated/prisma/client";

const prisma = new PrismaClient();

const features = [
  { description: "...", sortOrder: 1 },
  // ...
];

async function main() {
  // 既存 PENDING をすべて削除してから INSERT（冪等）
  await prisma.blogFeatureQueue.deleteMany({ where: { status: FeatureQueueStatus.PENDING } });
  await prisma.blogFeatureQueue.createMany({ data: features });
  console.log(`${features.length}件登録完了`);
}

main().finally(() => prisma.$disconnect());
```

`web/package.json` の `scripts` に追加:
```json
"db:seed-features": "tsx scripts/seed-feature-queue.ts"
```

---

## タスク2: 管理画面UI

### 配置場所

```
web/app/(admin)/admin/(protected)/blog/feature-queue/
  page.tsx                      # Server Component
  feature-queue-page-client.tsx # "use client"
web/app/api/admin/feature-queue/
  route.ts                      # GET（一覧）/ POST（追加）
web/app/api/admin/feature-queue/[id]/
  route.ts                      # PATCH（編集・並び替え）/ DELETE（削除）
```

### 管理画面の機能要件

- **一覧表示**: PENDING / PUBLISHED をタブ切り替えで表示。sortOrder 昇順
- **追加**: description テキストエリア + 追加ボタン（sortOrder は末尾に自動付与）
- **編集**: description をインライン編集
- **並び替え**: sortOrder の上下移動ボタン（ドラッグ不要）
- **削除**: PENDING のみ削除可能（PUBLISHED は削除不可）
- **残件数表示**: PENDING の残り件数を表示（キューが少ない場合は警告色）

### API設計

```
GET  /api/admin/feature-queue?status=PENDING  → BlogFeatureQueueRow[]
POST /api/admin/feature-queue                 → { description: string }
PATCH /api/admin/feature-queue/[id]           → { description?: string, sortOrder?: number }
DELETE /api/admin/feature-queue/[id]          → 204
```

### 既存パターンに従うこと

管理画面の既存ページ（例: `web/app/(admin)/admin/(protected)/blog/`）の実装パターンを必ず参照して合わせる。
- Server Component + Client Component 分離
- `assertAdminSession()` による認証
- Shadcn/ui コンポーネント使用

### リポジトリ関数（既実装）

`web/lib/server/repositories/blog-post.ts` の `blogFeatureQueueRepository`:
- `findNextPending()` — status=PENDING を sortOrder 昇順で1件取得
- `markPublished(id, blogPostId)` — 投稿後に PUBLISHED に更新
- `create(description, sortOrder)` — 1件追加
- `countPending()` — 残件数確認

必要に応じて `findAll(status?)`, `update(id, data)`, `delete(id)`, `reorder(id, direction)` 等を追加する。

---

## 型チェック・PR

```bash
cd web && npx tsc --noEmit
```

- ベースブランチ: `staging`
- 新規 PR を `staging` ベースで作成
