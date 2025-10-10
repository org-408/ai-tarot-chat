**完全に正しい指摘です！MasterConfig テーブルが必要ですね。**

## 現状の問題

```typescript
// モバイル側で期待しているデータ
interface MasterData {
  version: string; // ← これがない！
  cards: TarotCard[];
  spreads: Spread[];
}
```

しかし、Prisma スキーマには **マスターデータ全体のバージョンを管理するテーブルがない**。

---

## 解決策：MasterConfig テーブルを追加## schema.prisma への追加箇所

```prisma
// ==========================================
// Auth.js 5.0 標準モデル
// ==========================================
// の前、または

// ==========================================
// タロットデッキモデル
// ==========================================
// の前に追加してください
```

---

## 初期データのセットアップ

```typescript
// prisma/seed.ts または migration で実行
async function setupMasterVersion() {
  await prisma.masterConfig.upsert({
    where: { key: "MASTER_VERSION" },
    update: {},
    create: {
      key: "MASTER_VERSION",
      version: "1.0.0",
      description: "Initial master data version",
    },
  });
}
```

---

## サーバー側での使い方

### 1. バージョン取得 API

```typescript
// app/api/masters/version/route.ts
export async function GET() {
  const config = await prisma.masterConfig.findUnique({
    where: { key: "MASTER_VERSION" },
  });

  return Response.json({
    version: config?.version || "1.0.0",
    updatedAt: config?.updatedAt,
  });
}
```

### 2. マスターデータ更新時にバージョンを上げる

```typescript
// マスターデータを更新する処理
async function updateMasterData() {
  await prisma.$transaction([
    // カードデータの更新
    prisma.tarotCard.update({ ... }),

    // バージョンを上げる
    prisma.masterConfig.update({
      where: { key: "MASTER_VERSION" },
      data: {
        version: "1.1.0",  // セマンティックバージョニング
        description: "Added new tarot cards",
      },
    }),
  ]);
}
```

---

## マイグレーション手順

```bash
# 1. schema.prisma に MasterConfig を追加

# 2. マイグレーションファイル作成
npx prisma migrate dev --name add_master_config

# 3. 初期データ投入（seed または手動）
npx prisma db seed
```

---

## モバイル側は変更不要

既に `masterService.ts` で対応済み：

```typescript
// lib/services/master.ts
async getServerVersion(): Promise<string> {
  const data = await apiClient.get<{ version: string }>(
    "/api/masters/version"
  );
  return data.version;
}
```

---

## セマンティックバージョニングの運用

```
メジャー.マイナー.パッチ
  |      |      |
  |      |      └─ バグ修正（互換性あり）
  |      └──────── 機能追加（互換性あり）
  └─────────────── 破壊的変更（互換性なし）

例：
1.0.0 → 初期リリース
1.1.0 → 新しいカード追加
1.1.1 → カードの説明文修正
2.0.0 → データ構造の大幅変更
```

これで完璧です！MasterConfig テーブルを追加してください。
