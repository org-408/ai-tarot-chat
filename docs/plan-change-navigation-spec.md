# プラン変更後の遷移仕様

> モバイル (`/mobile`) と Web (`/web`) における、RevenueCat 経由のプラン購入（アップグレード / 無料登録）完了・キャンセル・失敗時の画面遷移仕様。過去に何度もデグレードしているため、正とする仕様を明文化する。
>
> Claude 向けのアンチパターン・チェックリストは [`.claude/rules/plan-change-navigation.md`](../.claude/rules/plan-change-navigation.md) 参照。

---

## 0. 基盤

### 0.1 lifecycle.ts（モバイル）はキャンセルを throw する

`mobile/src/lib/stores/lifecycle.ts` の `changePlan`:

- **キャンセル時**: `PurchaseCancelledError` を throw（`planChangeError` は set しない）
- **失敗時**: 既存 error を throw

呼び出し元は `instanceof PurchaseCancelledError` で判別する。Web は `useRevenuecat.purchase` が既に throw する設計のため `isUserCancelled(e)` で判別する。

### 0.2 `handleChangePlan` の options

```ts
handleChangePlan(
  newPlan: UserPlan,
  options?: { onSuccess?: "history" | "personal" | "stay" | "portrait" }
)
```

**ターゲット別のデフォルト（`options.onSuccess` 省略時）**:

| ターゲット | デフォルト遷移先 |
|---|---|
| → FREE | `history`（履歴機能解放が FREE の主目的） |
| → STANDARD | `stay`（現在地維持） |
| → PREMIUM | `personal` |

呼び出し元が明示した `options.onSuccess` が最優先。`"portrait"` は子コンポーネント（占い師カルーセル）内で `setMode("portrait")` を行うため、親の `handleChangePlan` 側では何もしない（現在地維持）。

---

## 1. 共通原則

| 結果 | 挙動 |
|---|---|
| **Success** | 呼び出し元の文脈に応じた遷移先（上記デフォルト規則 or `options.onSuccess`） |
| **Cancel** | **現在地維持**（サイレント、エラー表示なし） |
| **Fail** | **現在地維持** + エラートースト／インラインエラー表示 |

### Web も同じ原則に従う

技術的制約がない限り、Web はモバイルと同じ遷移ルールを適用する。

- 購入成功後に `/plans` に留めない（呼び出し元の文脈に戻す）
- 購入失敗時に `window.location.href = "/plans"` や `router.push("/plans")` で別画面に飛ばさない
- 購入失敗時に `console.error` のみで済まさない（UI 通知必須）

---

## 2. トリガー別仕様

### 2-1. 占い師選択モード内のアップグレード

**対象**:
- モバイル salon の tarotist モード（[tarotist-carousel-portrait.tsx](../mobile/src/components/tarotist-carousel-portrait.tsx) / `-embla.tsx` / `-stack.tsx`）
- Web `/simple` の carousel モード（[web/components/reading/tarotist-carousel-portrait.tsx](../web/components/reading/tarotist-carousel-portrait.tsx)）

**仕様**:

| 結果 | 遷移先 |
|---|---|
| Success | **portrait モード**（アップグレードした占い師で占う状態）|
| Cancel | **tarotist / carousel モード維持** |
| Fail | **tarotist / carousel モード維持** + エラートースト |

※ パーソナル占い（`/personal`）の tarotist モードは PREMIUM ユーザーのみ到達可能。非 PREMIUM ユーザーは `hasPersonal` ガードで home に redirect されるため、このトリガーは発生しない。

### 2-2. ホーム画面

| サブトリガー | 表示条件 | ターゲット | Success | Cancel / Fail |
|---|---|---|---|---|
| **a. パーソナル占い CTA** | 非 PREMIUM のとき | PREMIUM | **personal / `/personal`** | home 維持（Fail はエラートースト）|
| **b. 履歴 CTA（無料登録ボタン）** | GUEST のみ（GUEST は履歴 DB 未保存のため） | FREE | **履歴一覧 / `/history`** | home 維持（Fail はエラートースト）|
| **c. 最下部プラン説明セクション（UpgradeGuide）** | 非 PREMIUM | ユーザーが選んだプラン（FREE/STANDARD/PREMIUM） | **home 維持** | home 維持（Fail はエラートースト）|

### 2-3. プラン画面・占い師一覧画面（画面遷移不要）

これらは「能動的にプラン・占い師を見に来た画面」のため、購入後の遷移は不要。結果に関わらず現在地維持。

| 画面 | Success / Cancel / Fail 全て |
|---|---|
| モバイル PlansPage / Web `/plans` | **現在地維持**（Fail はインラインエラー表示）|
| Web `/tarotists` ダイアログ内「アップグレード」ボタン | **`/tarotists` 維持**（その場で `purchase()`、ダイアログは閉じる）|
| モバイル TarotistPage 内アップグレード | tarotists 画面維持 |

---

## 3. 現状の実装ギャップ（修正対象）

### モバイル

| # | 場所 | 現状 | 修正 |
|---|---|---|---|
| M1 | [`lifecycle.ts:1104-1116`](../mobile/src/lib/stores/lifecycle.ts) | キャンセルを throw せず `planChangeError` を set して `return` | `PurchaseCancelledError` throw に変更 |
| M2 | [`app.tsx:412-429`](../mobile/src/app.tsx) の `handleChangePlan` | `navigateToPersonal: true` のみ対応 | `options.onSuccess` 拡張。FREE デフォルト=`history`、PREMIUM デフォルト=`personal`、STANDARD デフォルト=`stay` |
| M3 | [`home-page.tsx:353`](../mobile/src/components/home-page.tsx) 最下部 UpgradeGuide | options 未渡し（デフォルト動作で FREE→history、PREMIUM→personal に誤遷移する可能性）| 全ターゲットで `{ onSuccess: "stay" }` を明示 |

### Web

| # | 場所 | 現状 | 修正 |
|---|---|---|---|
| W1 | [`home-client.tsx:45-48`](../web/app/home-client.tsx) | Fail 時 `window.location.href = "/plans"` | home 維持 + インラインエラー |
| W2 | [`tarotists/page.tsx:126-129`](../web/app/(app)/tarotists/page.tsx) | `router.push("/plans")`（購入せず遷移）| その場で `purchase()` 呼び出し、Success/Cancel/Fail 共に `/tarotists` 維持 |
| W3 | [`tarotist-carousel-portrait.tsx:112-115`](../web/components/reading/tarotist-carousel-portrait.tsx) | Fail 時 `console.error` のみ | 失敗トースト表示 |
| W4 | [`selection-view.tsx:143-148`](../web/components/reading/selection-view.tsx) | Link で `/plans`（`/personal` の `hasPersonal` ガードで home にリダイレクトされるため dead code）| 削除 |
| W5 | [`settings/page.tsx:209-211`](../web/app/(app)/settings/page.tsx) | URL 取得失敗で `/plans` に遷移 | トースト + 現在地維持 |
| W6 | [`settings/page.tsx:323`](../web/app/(app)/settings/page.tsx) | `/${locale}/plans` | `/plans` に統一 |

---

## 4. PR 分割方針

| PR | 内容 |
|---|---|
| **PR1** | 本仕様書 + `.claude/rules/plan-change-navigation.md` |
| **PR2** | M1 + M2 基盤修正（lifecycle throw 化 + `handleChangePlan` options 拡張）|
| **PR3** | M3 ホーム最下部 UpgradeGuide の `onSuccess` 明示 |
| **PR4** | W1 + W3 Web 失敗時のエラー表示統一 |
| **PR5** | W2 `/tarotists` ダイアログ in-place purchase 化 |
| **PR6** | W4 + W5 + W6 Web クリーンアップ |

---

## 5. デグレード検証シナリオ（手動テスト）

プラン変更周辺のコードに触れた PR をマージする前に、以下 **最低限** の手動検証を行う。

### モバイル

| # | シナリオ | 期待 |
|---|---|---|
| T1 | salon tarotist モードで PREMIUM 占い師タップ → アップグレード成功 | portrait モード |
| T2 | 同上 → キャンセル | **tarotist モード維持**（portrait に進まない）|
| T3 | 同上 → 失敗 | tarotist モード維持 + エラートースト |
| T4 | ホーム パーソナル CTA → PREMIUM アップグレード成功 | personal |
| T5 | 同上 → キャンセル | **home 維持** |
| T6 | 同上 → 失敗 | home 維持 + エラートースト |
| T7 | ホーム 履歴 CTA（GUEST 時）→ 無料登録成功 | **履歴一覧** |
| T8 | 同上 → キャンセル | home 維持 |
| T9 | ホーム最下部プラン説明 → 任意のプラン購入成功 | home 維持 |

### Web

| # | シナリオ | 期待 |
|---|---|---|
| W-T1 | `/simple` carousel 内 🔒 占い師 → アップグレード成功 | portrait |
| W-T2 | 同上 → キャンセル | carousel 維持 |
| W-T3 | 同上 → 失敗 | carousel 維持 + トースト |
| W-T4 | ホーム パーソナル CTA → アップグレード成功 | `/personal` |
| W-T5 | 同上 → 失敗 | **home 維持 + インラインエラー**（`/plans` に飛ばない）|
| W-T6 | `/tarotists` ダイアログ内アップグレード成功 | **`/tarotists` 維持** |
| W-T7 | 同上 → キャンセル / 失敗 | `/tarotists` 維持 |

---

## 6. 変更履歴

- 2026-04-24: 初版。v5 相当の確定仕様を明文化。
