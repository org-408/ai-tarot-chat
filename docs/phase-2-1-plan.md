# Phase 2.1 計画書 — DB 駆動マスターデータの多言語化

Apple 4.3(b) 対応の続編。Phase 2 ([apple-43b-plan.md](./apple-43b-plan.md))
で UI テキストのリポジション＋多言語化 (クライアント完結) は完了したが、
**DB の master data は日本語固定**のため、英語 UI で起動しても:

- カード名 (例: 「愚者」「女教皇」)
- カードキーワード (例: 「情熱」「インスピレーション」)
- カード意味本文 (meaning.upright / reversed — 長文)
- カテゴリ名 (例: 「恋愛」「仕事」「健康」「金運」)
- スプレッド名・guide (例: 「ケルト十字」)
- Tarotist の title / trait / bio
- プラン description
- **AI の応答** (サーバー prompt が日本語固定 → 応答も日本語)

が日本語で流れ込む。reviewer が英語 UI で実機テストした際、UI が英訳済みなのに
カード引いた瞬間から日本語が大量表示される状態は、4.3(b)「English UI を謳って
実態が locale 特化」という再指摘の火種になりうる。

---

## リスク評価

### Phase 2 単体で残るリスク

| 画面 | Phase 2 状態 | Phase 2.1 残件 | 重要度 |
|---|---|---|---|
| Home / Settings / Sidebar / Header | ✅ 完全英訳 | — | — |
| Salon カテゴリ選択 | UI ラベル英訳 | ❌ カテゴリ名 (DB) | 中 |
| スプレッド選択 | UI ラベル英訳 | ❌ スプレッド名・guide | 中 |
| Tarotist プロフィール | バッジ・ボタン英訳 | ❌ title / trait / bio 本文 | 中〜高 |
| カード引いた後 | UI ラベル英訳 | ❌ **カード名・キーワード・意味本文** | **高** |
| AI 応答 | — | ❌ **AI 応答が日本語** | **高** |

**特に危険なのは「カード引いた瞬間」と「AI 応答」**。見た目で一発で分かる上、
アプリのコア体験部分なので reviewer の印象を大きく左右する。

---

## 段階的アプローチ

DB スキーマ変更コストと翻訳作業量のバランスで 3 段階に分割する。

### 段階 1a: 既存 `language` カラム活用 (スキーマ変更なし)

対象テーブル (既に `language` フィールドを持つ):

- `TarotDeck`
- `TarotCard`
- `CardMeaning`

**作業:**

- 英語版 seed データを追加 (`web/prisma/seed.ts` or 別ファイル)
  - DeepL API 経由で日本語 → 英語の半自動翻訳が現実的
  - カード 78 枚 × 4 カテゴリ (love/career/health/money) × upright/reversed = **624 レコード**
- 既存の master-data 生成スクリプト (`web/prisma/generate-master.ts`) を
  言語別出力に拡張:
  - `master-data.ts` → `master-data-ja.ts` + `master-data-en.ts` (または 1 ファイル内で言語別 key)
- モバイル側:
  - `useLanguage` の現在値を見て読むマスターデータを切替
  - 初回ロード時に言語ごとにキャッシュ
  - ローカルキャッシュ (FilesystemRepository) のキーを言語別に分離

**工数:** 8-12h (翻訳 seed 作成が中心、スキーマ touches なし)

**効果:** カード関連の英訳が全て効く → **reviewer 印象が大きく改善**

### 段階 1b: サーバー AI prompt の英語化 (スキーマ変更なし)

対象: `web/lib/server/services/reading.ts` 等の AI prompt 構築箇所。

**作業:**

- `/api/readings/simple` / `/api/readings/personal` のリクエストに
  `language` パラメータ (or `Accept-Language` header) を追加
- サーバー側で language に応じて system prompt / user prompt を英語に差し替え
- モバイル側でリクエスト時に現在の言語を送信
- **4.3(b) NG ワード** (fortune / predict / horoscope / destiny / zodiac / fate)
  を英語プロンプトから排除
- 英語 AI 応答のトーンを「reflection / dialogue / persona」寄りに調整

**工数:** 4-6h (プロンプト設計・調整が中心)

**効果:** AI が英語で応答するようになる → **コア体験の一貫性確保**

### 段階 2: `language` カラム未持ちテーブルの対応 (スキーマ変更あり)

対象テーブル:

- `Plan` (name, description)
- `ReadingCategory` (name, description)
- `Spread` (name, guide)
- `SpreadCell` (position, description)
- `SpreadLevel` (name, description) ※使用可否要確認
- `Tarotist` (title, trait, bio)

**選択肢 A: 各テーブルに `language` + 翻訳レコードを追加 (TarotCard と同じパターン)**

```prisma
model Plan {
  id          String
  code        String  // FREE / STANDARD / PREMIUM
  language    String  // "ja" | "en"
  name        String
  description String
  // ...
  @@unique([code, language])
}
```

**選択肢 B: 関連テーブル (translation table) を別出し**

```prisma
model Plan {
  id    String
  code  String
  translations PlanTranslation[]
}

model PlanTranslation {
  planId   String
  language String
  name     String
  description String
  @@unique([planId, language])
}
```

- **A のメリット**: TarotCard と一貫、クエリが単純
- **B のメリット**: 原典レコード (code, price 等) と翻訳が分離、多言語拡張が綺麗
- 既存実装との親和性を考えると **A が工数少ない**

**作業 (選択肢 A ベース):**

- Prisma schema 変更 + migration
- seed 再生成 (ja + en)
- `web/lib/server/repositories/*.ts` の findMany クエリに language フィルタ
- `/api/masters/all` レスポンスに language パラメータを追加 (or 全言語返却してクライアント側でフィルタ)
- モバイル側クエリ変更

**工数:** 16-24h (テーブル 6 個 × 変更量)

**効果:** カテゴリ・スプレッド・Tarotist プロフィール等が英訳される

---

## 推奨実行順

1. **段階 1a + 1b を先行** (合計 12-18h) — スキーマ変更なし、高 ROI
2. 段階 1a+1b で Apple 再提出 → 通れば段階 2 は後回しでも OK
3. 段階 2 は通常機能追加フェーズでマイペースに

---

## 翻訳品質の担保

- DeepL API は **ランタイムには使わない** (Phase 1/2 の方針と同じ)
- `scripts/translate-master.ts` のような**ビルド時スクリプト**で一括生成
- 生成後は人間レビュー (NG ワード検出スクリプト `i18n-audit.mjs` と同等の
  master data 版を用意)
- 英語マスター seed は `web/prisma/master-data-en.json` として
  リポジトリにコミット (再現性確保)

---

## 検証

- **i18n-audit** を master data seed にも拡張:
  - 英語 seed に NG ワード (fortune/predict/horoscope/destiny/zodiac/fate) がないこと
  - 英語 seed に日本語が混入していないこと (翻訳漏れ検出)
- **Playwright smoke test** を拡張:
  - 英語ロケールでサロン → カード引く → 結果表示まで遷移
  - 画面全体に日本語文字・NG ワードがないことを確認
  - ([#237](https://github.com/org-408/ai-tarot-chat/issues/237) の基盤が必要)
- **staging 環境で実機確認**:
  - 英語端末で起動 → カード引く → AI 応答が英語か
  - 日本語端末で従来どおり動くか (回帰確認)

---

## スコープ外 (Phase 2.1 後)

- X / ブログ記事の英語化 (SEO 保護のため現状維持)
- Web ランディングの英語化 (日本向けで正当化可能)
- iOS Widget・音声モード等の新機能

---

## 関連

- [apple-43b-plan.md](./apple-43b-plan.md) - Phase 2 全体計画
- [apple-43b-instructions.md](./apple-43b-instructions.md) - Phase 2 実装手順
- [GitHub Issue #237](https://github.com/org-408/ai-tarot-chat/issues/237) - 将来のネイティブ E2E 基盤
