# BlogFeatureQueue 自動生成タスク

## 背景・目的

`web/lib/server/services/blog-post.ts` の `generateBuildInPublicContent()` は `BlogFeatureQueue` テーブルから
「次の PENDING な機能説明」を取得してブログ記事を生成する。

このキューが空だと機能紹介ブログが生成されない。キューにはユーザー向け機能の説明を
事前に登録しておく必要がある。

**やること: コードベースを解析して機能一覧を洗い出し、`BlogFeatureQueue` に投入するスクリプトを作る。**

---

## 対象コードベース

```
/Users/m_shioya/GitHub/ai-tarot-chat/
├── web/app/api/           # API エンドポイント（機能の実体）
├── web/app/(admin)/       # 管理画面
├── web/lib/server/services/  # ビジネスロジック
├── mobile/src/            # モバイルアプリ（ユーザー向け機能）
└── web/prisma/schema.prisma  # DBスキーマ（機能の構造を読む）
```

---

## 洗い出しの観点

**対象**: エンドユーザーが実際に使える・体験できる機能
- タロット占い（クイック・パーソナル）
- スプレッド種類（1枚引き・3枚・ケルト十字など）
- AI 占い師キャラクター選択
- 占い履歴
- お気に入りスプレッド
- プラン・サブスクリプション
- Web版での利用
- など

**除外**: インフラ・開発者向け・内部実装
- DB マイグレーション
- CI/CD
- 管理画面機能
- ロギング

---

## `description` フィールドの書き方

`generateBuildInPublicContent()` がこの `description` を受け取って Claude に渡し、
ユーザー向けブログ記事を生成する。

**書き方の条件:**
- ユーザー目線で「何ができるか」を1〜2文で説明
- 技術用語を使わない
- 例: `「今日の一枚」機能 — 毎朝AIがタロットカードを1枚引いて、その日のメッセージをお届けします`
- 例: `パーソナル占い — 悩みや状況を詳しく入力すると、AIがあなただけのタロットリーディングを行います`

---

## 実装手順

### 1. コード解析

以下を読んで機能一覧（20〜30件程度）を洗い出す:
- `web/prisma/schema.prisma`（モデル構造から機能を推測）
- `web/app/api/` 以下のルート
- `mobile/src/lib/services/` 以下
- `web/lib/server/services/` 以下

### 2. スクリプト作成

`web/scripts/seed-feature-queue.ts` を新規作成。内容:

```typescript
import { PrismaClient, FeatureQueueStatus } from "../lib/generated/prisma/client";

const prisma = new PrismaClient();

const features = [
  // ここに洗い出した機能リストを入れる
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

### 3. package.json にスクリプト追加

`web/package.json` の `scripts` に追加:

```json
"db:seed-features": "tsx scripts/seed-feature-queue.ts"
```

### 4. 型チェック・動作確認

```bash
cd web
npx tsc --noEmit
```

### 5. コミット・PR

- ベースブランチ: `staging`
- 既存 PR [#193](https://github.com/org-408/ai-tarot-chat/pull/193) に追加コミットしてよい

---

## 参考: リポジトリ関数

`web/lib/server/repositories/blog-post.ts` の `blogFeatureQueueRepository`:
- `findNextPending()` — status=PENDING を sortOrder 昇順で1件取得
- `markPublished(id, blogPostId)` — 投稿後に PUBLISHED に更新
- `create(description, sortOrder)` — 1件追加
- `countPending()` — 残件数確認
