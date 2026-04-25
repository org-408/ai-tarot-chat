# Apple 4.3(b) 検証カバレッジ

PR #259 で導入した自動検証層と、依然として手動確認が必要な項目を整理する。Apple 4.3(b) 対応の **退行検知ネット**として後続の開発で参照する。

- 対応 Issue: [#234](https://github.com/org-408/ai-tarot-chat/issues/234)
- 関連 PR: #258 (Task 5-7) / #259 (Phase 6 自動化)
- 計画書本体: [docs/apple-43b-plan.md](apple-43b-plan.md)
- 作業指示書: [docs/apple-43b-instructions.md](apple-43b-instructions.md)

---

## 1. 自動検証（CI で常時実行）

### 1.1 i18n audit (`npm run lint:i18n`)

スクリプト: [web/scripts/i18n-audit.mjs](../web/scripts/i18n-audit.mjs)

| チェック | 種別 | 内容 |
|---|---|---|
| `NG_WORD_EN` | error | `web/messages/en.json` の値に NG ワード (`fortune\|fortune-?telling\|predict(ion\|s\|or)?\|horoscope\|destiny\|fate\|zodiac`) が含まれる |
| `NG_WORD_JA` | error | 同 ja.json (英単語が混入していないか防御的に) |
| `JP_LEAK` | error | en.json の値に日本語文字 (ひらがな・カタカナ・CJK) が含まれる = 翻訳漏れ |
| `NG_WORD_SRC` | error | 審査スコープのソース (`web/app/auth`, `web/app/privacy`, `web/app/terms`, `web/app/[locale]`, `web/app/delete-account`, `web/components/auth`, `web/components/marketing`) のリテラル文字列に NG ワード |
| `JA_ONLY` / `EN_ONLY` | warning | ja.json と en.json のキー非対称。`(app)/` 配下の Task 5-4 が未着手のため許容（4.3(b) 通過後に解消） |

**Mobile 側の同等チェック**: [mobile/scripts/i18n-audit.mjs](../mobile/scripts/i18n-audit.mjs) (こちらはコード ↔ JSON のキー参照チェックも含む。i18next の `t("ns.key")` 形式が namespace 込みでキー抽出できるため)。

### 1.2 resolveLocale 単体テスト

スペック: [web/tests/resolve-locale.spec.ts](../web/tests/resolve-locale.spec.ts)

`resolveLocale()` ([web/lib/utils/resolve-locale.ts](../web/lib/utils/resolve-locale.ts)) の優先順位を網羅:

```
?lang=  >  NEXT_LOCALE cookie  >  Accept-Language ヘッダ  >  default "ja"
```

10 ケース:

- ?lang= が cookie / Accept-Language を上書き (en/ja 両方向)
- ?lang= が無いとき cookie が次点
- cookie も無いとき Accept-Language
- Accept-Language が ja/en のいずれでもない場合 default ja
- ?lang= に不正値が来たときの fallback (cookie へ)
- cookie に不正値が来たときの fallback (Accept-Language へ)
- 全部 null/undefined のときの default 動作

### 1.3 HTTP スモーク (Playwright)

スペック: [web/tests/locale-smoke.spec.ts](../web/tests/locale-smoke.spec.ts)

Playwright の `request` fixture で実 HTTP リクエストを叩き、レスポンス HTML に期待文字列が含まれる/含まれないことを assert。**日本国内のサーバーから Apple EN 審査員シナリオを再現できる**ように Accept-Language / `?lang=` / Cookie を直接組み立てている。

#### サインインページ (6 ケース)

| 入力 | 期待 |
|---|---|
| `Accept-Language: en-US` | `Sign in` を含む / `サインイン` を含まない |
| `Accept-Language: ja-JP` | `サインイン` を含む / `Sign in with Google` を含まない |
| `?lang=en` + `Accept-Language: ja-JP` | EN (lang クエリ優先) |
| `?lang=ja` + `Accept-Language: en-US` | JA (lang クエリ優先) |
| `Cookie: NEXT_LOCALE=en` | EN |
| `?lang=en` + `Cookie: NEXT_LOCALE=ja` | EN (lang が cookie より優先) |

#### Privacy / Terms (4 + 3 ケース)

各々について Accept-Language ja/en、`?lang=` ja/en で言語切替を確認。EN は `Privacy Policy` / `Terms of Service` を、JA は `プライバシーポリシー` / `利用規約` を assert。

#### マーケティング LP (2 ケース)

- `/en` → `AI personas`, `Reflect` を含む。`AIが読み解く` を含まない。**NG ワード混入チェック付き** (script/style 除外後の HTML に対して `\b(fortune|predict|horoscope|destiny|fate|zodiac)\b` がマッチしない)
- `/ja` → `AI占い師`, `AIが読み解く` を含む

#### Apple 審査員 golden path (1 ケース)

```
GET / (Accept-Language: en-US)
  → 30x redirect → Location: /auth/signin
GET /auth/signin (Accept-Language: en-US)
  → "Sign in" を含み "サインイン" を含まない
```

未認証 EN 審査員が `ariadne-ai.app/` を直叩きしたときの最重要シナリオ。

### 1.4 既存の周辺チェック（参考）

- `web/tests/pages.spec.ts`: 各ページが 200 OK / TypeError なしであること（中身検証はしない）
- `web/tests/smoke.spec.ts`: サーバー起動の最小確認

---

## 2. 手動検証が必要な項目

自動化していない／できない項目と、その理由。Phase 7 提出前に **必ず人間の目で踏破**する。

### 2.1 モバイル EN モード → Web サインインの locale 伝播

| 項目 | 確認方法 |
|---|---|
| モバイル Settings で言語を EN に切替 → サインインボタン → Web サインインが EN 表示 | iOS Simulator または TestFlight 実機 |
| モバイル EN モード → Settings → Privacy タップ → EN Privacy が表示 | 同上 |
| モバイル EN モード → Settings → Terms タップ → EN Terms が表示 | 同上 |

**自動化できない理由**: Capacitor アプリの起動と OS 設定の変更を伴うため。`signInWithWeb()` ([mobile/src/lib/services/auth.ts](../mobile/src/lib/services/auth.ts)) の URL 組み立ては PR #257 のコードレビューで `?lang=${i18n.language}` 付与を確認しているが、ランタイムでの実 OS 言語伝播は実機経由でしか検証できない。

**将来の自動化案**: `signInWithWeb()` 内の URL 構築部分を pure 関数として切り出し、`i18n.language` をモックして単体テスト化する余地はある。

### 2.2 認証済みユーザー導線

| 項目 | 確認方法 |
|---|---|
| Web Settings → Privacy リンクが現在 locale で `?lang=` 付き | サインインしてブラウザで踏む |
| Web Settings → Terms リンクが現在 locale で `?lang=` 付き | 同上 |

**自動化していない理由**: 既存の認証済み e2e (`web/tests/authenticated.spec.ts`) は Settings ページの遷移までしかカバーしていない。Privacy/Terms へのリンクの `?lang=` 付与は PR #256 のコードレビューで確認済み。

**将来の自動化案**: `authenticated.spec.ts` に「Settings → Privacy/Terms リンク href が locale 連動」のアサーションを追加する。

### 2.3 マーケ LP の周辺ページ

| 項目 | 確認方法 |
|---|---|
| `/en/pricing` が EN 表示 | ブラウザで目視 |
| `/en/download` が EN 表示 | 同上 |
| `/en/ranking` が EN 表示 | 同上 |

**自動化していない理由**: Task 5-7-2 で「page.tsx 優先・余力次第」と整理しスコープ外にした。これらのページはまだ JA ハードコードが残っている可能性が高く、自動チェックを入れると warning が大量発生して Apple 4.3(b) の本筋ノイズになる。

**将来の対応**: 4.3(b) 通過後の Task 5-4 後追いと合わせて i18n 化、自動チェックも拡張。

### 2.4 App Store Connect 提出物

| 項目 | 確認方法 |
|---|---|
| アプリ名 / サブタイトル / カテゴリ ja/en | ASC で目視 |
| 説明文 ja/en（`fortune-telling` 等の NG ワード混入なし） | ASC で目視 + 提出前にコピペ元 [docs/apple-43b-plan.md §2](apple-43b-plan.md) を再 grep |
| Review Notes（[docs/apple-43b-plan.md §3](apple-43b-plan.md)） | ASC で目視 |
| Marketing URL `https://ariadne-ai.app/` のまま | ASC で目視 |
| Support URL を `/support` に更新（`/delete-account` から差し替え） | ASC で目視 |
| Account Deletion URL に `/delete-account` 設定 | ASC で目視 |
| スクリーンショット 1 枚目チャット / カード大写しなし / ja/en 別撮影 | ASC で目視 |

**自動化対象外**: ASC API は読み取りメインで提出物の自動 lint には実質使えない。Phase 7 は人間の作業。

### 2.5 EN 実機 UX

| 項目 | 確認方法 |
|---|---|
| TestFlight ビルド (#44 以降) を EN OS 設定で起動 → 全画面 EN | 実機 |
| Personal Reading フローを EN で完走 → AI 応答も EN | 実機 |
| サブスクリプション購入フロー EN | 実機 (sandbox) |

---

## 3. ローカル実行方法

### 3.1 i18n audit のみ

```bash
cd web
npm run lint:i18n
```

`errors=0` であること。`warnings` は許容。

### 3.2 Playwright スモークのみ

```bash
cd web
# 事前にビルド済みであれば npm run start で立ち上がっているサーバーが再利用される
npx playwright test --project=unauthenticated
```

`unauthenticated` プロジェクトに `smoke.spec.ts` / `pages.spec.ts` / `locale-smoke.spec.ts` / `resolve-locale.spec.ts` が含まれる。

### 3.3 全体 (CI と同等)

```bash
cd web
npm run lint
npm run lint:i18n
npx tsc --noEmit
npm run build
npx playwright test
```

---

## 4. CI が落ちたときの対処

| エラー種別 | 対処 |
|---|---|
| `NG_WORD_EN <key>: "..."` | `web/messages/en.json` の該当キーを `docs/apple-43b-plan.md §8 NG ワードリスト` に従ってリポジション |
| `NG_WORD_JA <key>: "..."` | ja.json に英単語が紛れ込んでいる。除去 or 英単語そのものをリポジション |
| `JP_LEAK <key>: "..."` | en.json に翻訳漏れ。EN に翻訳して埋める |
| `NG_WORD_SRC web/app/...:line` | TS/TSX のハードコード文字列に NG ワード。i18n キーに切り出す or 文言を直す |
| HTTP スモーク失敗 (例: `/auth/signin に "Sign in" が含まれない`) | locale 解決ロジック ([web/lib/utils/resolve-locale.ts](../web/lib/utils/resolve-locale.ts)) または signin/privacy/terms ページの `?lang=` / cookie / Accept-Language 取り回しの退行を疑う |
| `resolveLocale 優先順位` 失敗 | 優先順位を変更してしまっている。仕様 (lang > cookie > Accept-Language > default) を維持すべき |

---

## 5. 将来追加候補

優先度の高い順:

1. **モバイル `signInWithWeb()` URL 構築の単体テスト**: `?lang=` 付与の退行検知。`auth.ts` 内のロジックを pure function に分離して vitest or playwright unit で叩く
2. **認証済み e2e に Privacy/Terms リンク assert を追加**: Settings → Privacy/Terms の `?lang=${locale}` 付与を `authenticated.spec.ts` に追加
3. **マーケ LP 周辺ページの i18n 化と smoke 拡張**: Task 5-4 の後追いと合わせて `/en/pricing` `/en/download` `/en/ranking` を i18n 化、smoke ケース追加
4. **NG ワード grep の対象ディレクトリ拡張**: 現状は審査スコープに絞っているが、blog 配下も Apple が踏み得るので追加検討

---

## 6. このドキュメントの更新タイミング

- 新たな自動テストを追加した → §1 に追記
- 自動化で潰した手動項目があった → §2 から §1 に移動
- 4.3(b) 通過後に Task 5-4 が完了した → §2.3 を削除、§1 に対応する自動チェックを記載
- NG ワードリストや locale 解決の仕様が変わった → §1.1 / §1.2 / §4 を更新
