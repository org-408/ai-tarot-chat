# ルーティング再設計 — サービス型 URL 構造への移行

## 背景・目的

現状は `/` にマーケティング LP を置き、サービス本体は `/ja/salon` に埋まっている。
Claude.ai 等のサービス型 SaaS に倣い、**サービス本体をルートに据え、マーケティングページは `[locale]` 配下に整理**する。

## Before / After URL 構造

### 公開ページ（SEO 対象）

| Before | After | 備考 |
|---|---|---|
| `/` | `/` | スマートエントリ（後述） |
| `/` (LP) | `/ja/` | LP の正規 URL |
| `/pricing` | `/ja/pricing` | 301 リダイレクト設置 |
| `/download` | `/ja/download` | 301 リダイレクト設置 |
| — | `/en/` | 将来追加（英語 LP） |
| — | `/en/pricing` | 将来追加 |

### アプリページ（認証必須・SEO 非対象）

| Before | After | 備考 |
|---|---|---|
| `/ja/salon` | `/salon` | 301 リダイレクト設置 |
| `/ja/reading` | `/reading` | 同上 |
| `/ja/personal` | `/personal` | 同上 |
| `/ja/history` | `/history` | 同上 |
| `/ja/tarotists` | `/tarotists` | 同上 |
| `/ja/plans` | `/plans` | 同上 |
| `/ja/settings` | `/settings` | 同上 |

### 変更なし

| URL | 内容 |
|---|---|
| `/auth/signin` | サインインページ |
| `/auth/mobile/callback` | モバイルコールバック |
| `/admin/...` | 管理画面 |
| `/privacy`, `/terms`, `/delete-account` | 静的ページ |

---

## スマートエントリ（`/`）の動作

```
ユーザーが / にアクセス
    ↓
app/page.tsx（Server Component）
    ↓
session = await auth()
    ├─ session あり → redirect("/salon")   // ログイン済み → アプリ直行
    └─ session なし → redirect("/ja")      // 未ログイン → LP（デフォルトロケール）
```

`/ja/` (LP) でも同様に session チェックを行い、ログイン済みなら `/salon` へ。

---

## ファイル構造変更

### PR 1 後

```
web/app/
  page.tsx                              ← NEW: スマートエントリ
  [locale]/
    layout.tsx                          ← 変更なし（NextIntlClientProvider）
    (marketing)/                        ← NEW（旧 app/(marketing)/ を移動）
      layout.tsx                        ← ナビ + フッター（locale 対応リンク）
      page.tsx                          ← LP + session チェック
      pricing/page.tsx
      download/page.tsx
    (app)/                              ← 変更なし（PR 2 で移動）
      layout.tsx
      salon/page.tsx ... etc

  (marketing)/                          ← DELETED（[locale]/(marketing)/ へ移動）
  [locale]/page.tsx                     ← DELETED（(marketing)/page.tsx と競合するため）

  next.config.ts                        ← 301 リダイレクト追加
  middleware.ts                         ← skipIntl リスト更新
  i18n/navigation.ts                    ← NEW: createNavigation ヘルパー
```

### PR 2 後

```
web/app/
  (app)/                                ← NEW（旧 [locale]/(app)/ を locale なしで移動）
    layout.tsx                          ← auth + sidebar + cookie-based locale
    salon/page.tsx
    reading/page.tsx ... etc

  [locale]/(app)/                       ← DELETED
  [locale]/layout.tsx                   ← マーケティング専用になる（スリム化）
  i18n/request.ts                       ← cookie フォールバック追加
```

---

## i18n 戦略

### マーケティングページ（`[locale]/(marketing)/`）

- URL に locale が入る → next-intl が自動処理
- `getLocale()` または `params.locale` から locale 取得
- 将来 `/en/` を追加する際も構造変更不要

### アプリページ（`(app)/`）

- URL に locale が入らない → cookie-based locale
- next-intl の middleware が `/ja/` 訪問時に `NEXT_LOCALE=ja` cookie をセット
- `(app)/layout.tsx` でこの cookie を読んで `NextIntlClientProvider` に渡す
- `i18n/request.ts` も cookie フォールバックに対応

---

## PR 分割方針

| PR | 内容 | ベースブランチ |
|---|---|---|
| PR 1 | マーケティング多言語化 + スマートエントリ | staging |
| PR 2 | アプリページ locale 除去（`/ja/salon` → `/salon`） | PR 1 ブランチ |
| PR 3 | SEO 基盤整備（`robots.txt`・`hreflang`） | PR 2 ブランチ |

---

## 301 リダイレクト一覧（next.config.ts に追加）

### PR 1 で追加

```
/pricing  → /ja/pricing  (permanent)
/download → /ja/download (permanent)
```

### PR 2 で追加

```
/ja/salon     → /salon     (permanent)
/ja/reading   → /reading   (permanent)
/ja/personal  → /personal  (permanent)
/ja/history   → /history   (permanent)
/ja/tarotists → /tarotists (permanent)
/ja/plans     → /plans     (permanent)
/ja/settings  → /settings  (permanent)
```

---

## robots.txt（PR 3 で追加）

```
User-agent: *
Allow: /
Disallow: /salon
Disallow: /reading
Disallow: /personal
Disallow: /history
Disallow: /tarotists
Disallow: /plans
Disallow: /settings
Disallow: /admin/
Disallow: /auth/
Disallow: /api/
```

---

## hreflang（PR 3 で追加）

```html
<!-- /ja/* のマーケティングページに追加 -->
<link rel="alternate" hreflang="ja" href="https://example.com/ja/" />
<link rel="alternate" hreflang="x-default" href="https://example.com/" />

<!-- 将来 /en/ 追加時 -->
<link rel="alternate" hreflang="en" href="https://example.com/en/" />
```
