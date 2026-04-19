---
paths:
  - "**"
---

# クロスプラットフォーム影響の確認

## 片側を直したらもう一方も必ず確認する

このプロジェクトは **Web (`/web`)・モバイル (`/mobile`)・デスクトップ (`/src`, `/src-tauri`)・共有 (`/shared`)** の複数レイヤーに跨っている。
片方を修正したとき、もう一方に影響がないかを **修正前に必ず確認**すること。

```
❌ 片側だけ直してコミット → もう片側が壊れる（実例: #167 前の /api/clients/readings レスポンス形式変更）
✅ 修正前に影響範囲を列挙 → すべての呼び出し箇所を同一 PR で直す
```

## 特に注意が必要な修正

以下を変更するときは **必ず** 全プラットフォームを横断 grep してから着手する。

### 1. API の契約変更

- `/web/app/api/**/route.ts` のリクエスト・レスポンス形式
- 呼び出し元: `mobile/src/lib/services/`、`web/lib/client/services/`、`src/` (Tauri) の `fetch` / `apiClient`
- **型注釈は警告にならない** — `apiClient.get<Reading[]>` と書いてあっても実レスポンスがオブジェクトなら静かに壊れる

### 2. `/shared/lib/types.ts` の型変更

- Web・モバイル両方が import している
- フィールド削除・rename は両側の使用箇所を grep

### 3. `/shared/components/` のコンポーネント Props 変更

- Web と（将来の）モバイルで同じコンポーネントを使う前提
- Props 追加は省略可にするか、全呼び出し元を更新する

### 4. DB スキーマ・マスターデータ形式

- Prisma schema 変更 → Web API レスポンス形状 → モバイル受け取り側すべてに波及
- `MasterConfig` バージョンも忘れず更新

## 着手前チェックリスト

API / shared 型 / shared コンポーネントに触る前に以下を宣言する。

```
修正対象: <path>
影響範囲:
  - web/...: 呼び出し箇所
  - mobile/...: 呼び出し箇所
  - src/... (Tauri): 呼び出し箇所
  - shared/...: 型の使用箇所
同一 PR で直す箇所: <列挙>
```

該当なしなら「該当なし」と明示。**無言で片側だけ直すのは禁止**。

## grep の起点

```bash
# API エンドポイント
grep -rn "/api/clients/readings" mobile/ web/ src/ shared/

# サービスメソッド名
grep -rn "getReadingHistory" mobile/ web/ shared/

# 型名
grep -rn "Reading\[\]" mobile/ web/ shared/
```

## なぜこのルールか

- **型だけでは守れない**: 型アサーション（`as T` / `<T>`）や手書きジェネリクスは実レスポンスを検証しないため、契約違反がランタイムまで検知されない
- **テストだけでも守れない**: 片側のユニットテストは契約変更に気付けない
- **レビューでは見落とす**: 「Web の小さな修正」に見えてモバイルを壊すパターンが典型
- 先に影響範囲を宣言することでユーザー・レビューアが「抜け」を指摘できる
