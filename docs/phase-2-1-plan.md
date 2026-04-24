# Phase 2.1 計画書 — DB 駆動マスターデータの多言語化

Apple 4.3(b) 対応の続編。Phase 2 ([apple-43b-plan.md](./apple-43b-plan.md))
で UI テキストのリポジション＋多言語化 (クライアント完結) は完了したが、
**DB の master data は日本語固定で読まれている**ため、英語 UI で起動しても:

- カード名 (例: 「愚者」「女教皇」)
- カードキーワード (例: 「情熱」「インスピレーション」)
- カード意味本文 (meaning.upright / reversed — 長文)
- カテゴリ名 (例: 「恋愛」「仕事」「健康」「金運」)
- スプレッド名・guide (例: 「ケルト十字」)
- Tarotist の title / trait / bio
- プラン name, description
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

## 既存資産の棚卸し

| テーブル | `language` 列 | 英語 seed | 備考 |
|---|---|---|---|
| `TarotDeck` | ✅ あり | ✅ 既存（`docs/tarot_data_dictionary_en.json` + `web/lib/server/services/seed.ts` で ja/en 両方投入済み） | **切替ロジック実装だけ** |
| `TarotCard` | ✅ あり | ✅ 既存（同上） | **切替ロジック実装だけ** |
| `CardMeaning` | ✅ あり | ✅ 既存（同上） | **切替ロジック実装だけ** |
| `Plan` | ❌ なし | ❌ なし | スキーマ変更 + 翻訳必要（4 レコード × name/description） |
| `ReadingCategory` | ❌ なし | ❌ なし | スキーマ変更 + 翻訳必要（〜7 レコード × name/description） |
| `Spread` | ❌ なし | ❌ なし | スキーマ変更 + 翻訳必要（全スプレッド × name, guide） |
| `SpreadCell` | ❌ なし | ❌ なし | スキーマ変更 + 翻訳必要（各 cell の position, description） |
| `SpreadLevel` | ❌ なし | ❌ なし | 使用可否要確認。使用なら同上 |
| `Tarotist` | ❌ なし | ❌ なし | スキーマ変更 + 翻訳必要（8 人 × title/trait/bio） |

**重要:** カード系（量が圧倒的に多い部分）の英訳は既に揃っている。
翻訳が必要なのは **レコード数が少ないテーブル群**のみなので、
Claude がセッション内で直接翻訳を書けば済む。**DeepL 等の外部 API は不要**。

---

## 段階的アプローチ

### 段階 1a: 既存 `language` カラム活用による切替実装 (スキーマ変更なし、翻訳不要)

**対象:** `TarotDeck` / `TarotCard` / `CardMeaning`

**状況:**

- DB schema には既に `language` 列あり
- 英語 seed は `docs/tarot_data_dictionary_en.json` として完備
- `web/lib/server/services/seed.ts` (`getTarotDeckData()`) は **ja と en の両方を DB に投入している**
- 現状、モバイルは言語を考慮せず fetch しているため、どちらの language が降ってくるかは実装依存

**作業:**

- BFF 側:
  - `/api/masters` (or `/api/masters/all`) のレスポンスに現在選択されている language で絞った TarotDeck/TarotCard/CardMeaning を返すよう変更
  - または全言語返却してクライアントで選ばせる（データ量的に許容範囲ならこちらの方が簡潔）
  - master-data-staging.ts / master-data-production.ts 生成スクリプト
    (`web/prisma/generate-master.ts`) を **言語別出力に拡張**:
    - `master-data-ja.ts` + `master-data-en.ts` の 2 ファイル生成
    - ビルド時に Vite の環境変数で切り替え、**or** 1 ファイルに `{ ja: ..., en: ... }` として同梱（バンドルサイズ要検討）
- モバイル側:
  - `useLanguage` の現在値を見て読むマスターデータを切替
  - `FilesystemRepository` のキャッシュキーを言語別に分離
    (`master-data-ja` / `master-data-en`)
  - `/api/masters/check-update` の挙動確認（言語ごとにバージョンを持つ必要があるか検討）

**工数:** 4-6h (翻訳作業ゼロ、切替ロジック実装のみ)

**効果:** カード名・キーワード・意味本文が全て英訳される → **reviewer 印象が大きく改善**

### 段階 1b: サーバー AI prompt の英語化 (スキーマ変更なし、翻訳は prompt engineering)

**対象:** `web/lib/server/services/reading.ts` 等の AI prompt 構築箇所。

**作業:**

- `/api/readings/simple` / `/api/readings/personal` のリクエストに
  `language` パラメータ (or `Accept-Language` header) を追加
- サーバー側で language に応じて system prompt / user prompt を英語版に差し替え
- Tarotist のキャラクター設定も英語版を用意（既存の日本語 prompt をベースに Claude が直接翻訳）
- モバイル側でリクエスト時に現在の言語を送信
- **4.3(b) NG ワード** (fortune / predict / horoscope / destiny / zodiac / fate)
  を英語プロンプトから完全排除
- 英語 AI 応答のトーンを「reflection / dialogue / persona」寄りに調整
  （Tarotist の語り口は各キャラのペルソナを維持）

**工数:** 4-6h (Claude が prompt engineering で直接対応)

**効果:** AI が英語で応答するようになる → **コア体験の一貫性確保**

### 段階 2: `language` カラム未持ちテーブルへの多言語化 (スキーマ変更あり、翻訳は Claude が直接)

**対象テーブル:**

- `Plan` (4 レコード × name, description)
- `ReadingCategory` (〜7 レコード × name, description)
- `Spread` (全スプレッド × name, guide)
- `SpreadCell` (各 spread のセル × position, description)
- `SpreadLevel` (使用可否要確認。使用なら name, description)
- `Tarotist` (8 人 × title, trait, bio)

**選択肢 A: 各テーブルに `language` + 翻訳レコードを追加 (TarotCard と同じパターン)**

```prisma
model Plan {
  id          String
  code        String  // FREE / STANDARD / PREMIUM — 言語非依存キー
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
  id           String
  code         String
  translations PlanTranslation[]
}

model PlanTranslation {
  planId      String
  language    String
  name        String
  description String
  @@unique([planId, language])
}
```

- **A のメリット**: TarotCard と一貫、クエリが単純
- **B のメリット**: 原典レコード (code, price 等) と翻訳が分離、多言語拡張が綺麗
- 既存実装との親和性を考えると **A が工数少ない**（推奨）

**作業 (選択肢 A ベース):**

- Prisma schema 変更 + migration
- **翻訳データは Claude がセッション内で直接書く**（量が少ないため外部 API 不要）:
  - Plan 4 件 + ReadingCategory 7 件 + Spread 〜20 件 + SpreadCell 〜50 件 +
    Tarotist 8 件 = 合計 **100 レコード未満**
  - bio だけ多少長文だが、各 200 文字程度 × 8 人 ≈ 1600 文字
- `web/lib/server/repositories/*.ts` の findMany クエリに language フィルタ
- `/api/masters/all` レスポンスを言語対応
- モバイル側クエリ変更

**工数:** 8-12h (schema 変更・migration・seed 追加・repository/API 変更)

**効果:** カテゴリ・スプレッド・Tarotist プロフィール等すべて英訳される

---

## 推奨実行順（次セッションスコープ）

**段階 1a + 1b を一気に実装** (合計 8-12h) → staging 上で実機検証 → PR

段階 2 はさらに次セッション以降で対応。段階 1a+1b だけでも**カード引いた瞬間と
AI 応答という 2 大リスクが解消される**ため、Apple 再提出にはこれで十分目処が立つ。

---

## 翻訳品質の担保

**Claude がセッション内で直接翻訳する方針**（DeepL / OpenAI API 等の外部サービス不要）

- カード系の英訳は既に存在（`tarot_data_dictionary_en.json`）
- 段階 2 のテーブル群は Claude が日本語を読んで英訳を書く
- 4.3(b) NG ワードは禁止リスト付きで Claude が直接回避

**検証:**

- `i18n-audit.mjs` を master data seed にも拡張:
  - 英語 seed に NG ワード (fortune/predict/horoscope/destiny/zodiac/fate) がないこと
  - 英語 seed に日本語が混入していないこと
- **Playwright smoke test** を拡張（段階 1a+1b 完了後）:
  - 英語ロケールでサロン → カード引く → 結果表示まで遷移
  - 画面全体に日本語文字・NG ワードがないことを確認
  - ([#237](https://github.com/org-408/ai-tarot-chat/issues/237) の基盤が完成したら更に網羅的に)
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
- PR [#236](https://github.com/org-408/ai-tarot-chat/pull/236) - Phase 2 実装
- Issue [#237](https://github.com/org-408/ai-tarot-chat/issues/237) - 将来のネイティブ E2E 基盤
- Issue [#238](https://github.com/org-408/ai-tarot-chat/issues/238) - Phase 2.1 タスク追跡
