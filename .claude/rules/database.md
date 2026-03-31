---
paths:
  - "web/prisma/**"
  - "web/lib/server/repositories/**"
---

# データベース・Prisma ルール

## スキーマ変更時の手順

```bash
# 1. schema.prisma を編集
# 2. マイグレーション実行
cd web && npm run db:migrate

# 3. Prisma クライアント再生成（migrate が自動でやることが多いが念のため）
npm run db:generate

# 4. マスターデータ系テーブルを変更した場合
npm run db:master   # MasterConfig バージョンを更新
```

## マスターデータ変更時の追加手順

`TarotCard`, `TarotDeck`, `CardMeaning`, `Spread`, `SpreadCell`, `SpreadLevel`, `ReadingCategory`, `Tarotist`, `Plan` を変更した場合は必ず `MasterConfig` バージョンを上げる。

モバイルアプリが起動時に `/api/masters/check-update` でバージョン確認し、古ければ全データを再取得するため、バージョン更新を忘れるとモバイルに変更が反映されない。

## リポジトリ層の書き方

```typescript
// repositories/xxx.ts
import { prisma } from "./database";

export async function findClientById(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: { plan: true },
  });
}
```

- 関数は `async` で返す
- `include` で必要なリレーションのみ取得（over-fetching 禁止）
- 複雑なクエリには `@@index` が設定されているか確認

## Client と User の使い分け

| モデル | 用途 |
|---|---|
| `User` | Auth.js OAuth 用。直接ビジネスロジックに使わない |
| `Client` | アプリのビジネスロジック用ユーザー |

ゲストユーザーは `Client.userId = null`、`Device` で識別される。

## ソフトデリート

`Client` はハードデリートせず `deletedAt` に日時をセットする。

```typescript
// 削除
await prisma.client.update({
  where: { id },
  data: { deletedAt: new Date() },
});

// 取得時は必ず除外
await prisma.client.findMany({
  where: { deletedAt: null },
});
```

## 日次リセット

`Client.dailyReadingsCount` 等は日付変更時に 0 にリセットされる。リセット時は `DailyResetHistory` に before/after を記録する。

## 多言語データ

`TarotCard`, `TarotDeck`, `CardMeaning` は `language` フィールドで多言語対応。
- デフォルト言語: `"en"`
- 日本語: `"ja"`

## 開発環境リセット

```bash
cd web
npm run db:reset+    # DB全消去 → マイグレーション → シード投入
```

データが壊れたりスキーマと合わなくなったときに使う。本番では絶対に実行しない。
