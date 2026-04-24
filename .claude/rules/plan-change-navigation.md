# プラン変更後の遷移ルール（デグレード防止）

このプロジェクトではプラン変更（アップグレード／無料登録）後の遷移仕様が **何度もデグレードしている**。新機能追加のたびに Cancel/Fail 時の挙動が崩れ、ユーザーを間違った画面に飛ばすバグが再発する。このルールは仕様の不変式とアンチパターンを明文化して、再発を防ぐためのもの。

**完全仕様**: [`docs/plan-change-navigation-spec.md`](../../docs/plan-change-navigation-spec.md)

---

## このルールを必ず読むべきファイル・関数

以下のいずれかに触れるときは、**編集前にこのルールと [`docs/plan-change-navigation-spec.md`](../../docs/plan-change-navigation-spec.md) を読む**。編集後はチェックリスト（本ルール末尾）で検証する。

### モバイル
- `mobile/src/app.tsx`（`handleChangePlan`、プラン関連 effect）
- `mobile/src/lib/stores/lifecycle.ts`（`changePlan` の購入フロー）
- `mobile/src/lib/stores/client.ts`、`mobile/src/lib/stores/subscription.ts`
- `mobile/src/components/tarotist-carousel-portrait.tsx` / `-embla.tsx` / `-stack.tsx`
- `mobile/src/components/home-page.tsx`
- `mobile/src/components/upgrade-guide.tsx`
- `mobile/src/components/profile-dialog.tsx`
- `mobile/src/components/plans-page.tsx`
- `mobile/src/components/tarotist-page.tsx`
- `mobile/src/components/salon-page.tsx`
- `mobile/src/components/personal-page.tsx`

### Web
- `web/lib/client/revenuecat/hooks/use-revenuecat.ts`
- `web/app/home-client.tsx`
- `web/app/(app)/plans/page.tsx`
- `web/app/(app)/tarotists/page.tsx`
- `web/app/(app)/settings/page.tsx`
- `web/app/(app)/personal/page.tsx`
- `web/app/(app)/simple/page.tsx`
- `web/components/reading/selection-view.tsx`
- `web/components/reading/tarotist-carousel-portrait.tsx`

---

## 不変式（絶対に守る 3 点）

1. **Cancel/Fail は現在地維持**。何があっても別画面に飛ばさない。
2. **Success 後の遷移先は、呼び出し元の文脈から宣言する**。ライブラリ層（lifecycle/hook）が勝手に遷移しない。
3. **Cancel と Fail は区別して上位に伝搬する**。lifecycle は throw、呼び出し側は `instanceof PurchaseCancelledError`（モバイル）または `isUserCancelled(e)`（Web）で判別。

---

## 禁止アンチパターン

### ❌ アンチパターン 1: Fail 時に別画面へ遷移

```ts
// NG（Web）
} catch (e) {
  if (!isUserCancelled(e)) {
    window.location.href = "/plans";   // ← 失敗したのに /plans に飛ばすな
    router.push("/plans");             // ← 同上
  }
}
```

```ts
// OK
} catch (e) {
  if (!isUserCancelled(e)) {
    setError(t("checkoutError"));      // インラインエラー or トースト
  }
}
```

### ❌ アンチパターン 2: lifecycle でキャンセルを吸収（throw しない）

```ts
// NG（mobile/src/lib/stores/lifecycle.ts）
if (subscriptionStore.purchaseError?.includes("キャンセル")) {
  set({ planChangeError: i18n.t("error.purchaseCancelled") });
  return;   // ← キャンセル吸収 → 呼び出し元が「成功」と誤認 → 遷移バグ
}
throw purchaseError;
```

```ts
// OK
if (subscriptionStore.purchaseError?.includes("キャンセル")) {
  set({ isChangingPlan: false, planChangeError: null });
  throw new PurchaseCancelledError();  // 必ず throw
}
throw purchaseError;
```

### ❌ アンチパターン 3: 購入後に無条件で `setPageType` / `router.push`

```ts
// NG
try {
  await changePlan(plan);
  setPageType("personal");  // ← lifecycle がキャンセル吸収すると、キャンセル時にも発火
}
```

```ts
// OK（lifecycle が throw する前提、かつ呼び出し元の文脈で遷移先を決める）
try {
  await changePlan(plan);
  const target = options?.onSuccess ?? defaultByTarget(newPlan);
  if (target === "personal") setPageType("personal");
  else if (target === "history") setPageType("history");
  // "stay" / "portrait" は何もしない
} catch (e) {
  if (e instanceof PurchaseCancelledError) return;
  // 既存のエラートースト
}
```

### ❌ アンチパターン 4: プラン不足ガードを `Link href="/plans"` にする

```tsx
// NG（web/components/reading/selection-view.tsx 系）
<Link href="/plans">{upgradeAction}</Link>   // ← /plans 行きっぱなしで戻れない
```

```tsx
// OK（その場で purchase、成功後は元画面で続行）
<button onClick={async () => {
  try {
    await purchase(requiredPlan);
    await refreshUsage();
    // 元画面で選択状態に遷移
  } catch (e) {
    if (!isUserCancelled(e)) toast.error(t("checkoutError"));
  }
}}>
  {upgradeAction}
</button>
```

### ❌ アンチパターン 5: Fail 時に `console.error` のみで UI 通知なし

```ts
// NG
} catch (e) {
  if (!isUserCancelled(e)) console.error(e);  // ← ユーザーには何も見えない
}
```

```ts
// OK
} catch (e) {
  if (!isUserCancelled(e)) toast.error(t("checkoutError"));
}
```

### ❌ アンチパターン 6: Web で「モバイルと違う遷移」を理由なく実装

モバイルで salon tarotist モード → アップグレード → portrait モード に遷移するのに、Web の `/simple` や `/tarotists` で同等の操作をして `/plans` に飛ばして留まる、というような非対称は **ユーザー目線で壊れている**。技術的制約がない限り、モバイルと同じ遷移を実装すること。

---

## 触る前の確認（pre-flight）

本ルール対象ファイルを編集する前に、以下を確認する。

1. **今のコードが遷移仕様 v5 に沿っているか**：コード冒頭から `catch`、`router.push`、`setPageType`、`window.location` を目視して、Fail/Cancel で別画面に飛ばしていないか
2. **自分の変更で、その振る舞いを壊さないか**：新規の `catch`/`setPageType` を追加するなら、Cancel と Fail を区別しているか

## 完了前チェックリスト（必須）

対象ファイルを編集した PR は、以下 6 点を全て満たしているか自問する。満たさない場合は push しない。

- [ ] プラン変更の **Cancel** 時、現在地から動かない（画面遷移しない）
- [ ] プラン変更の **Fail** 時、現在地から動かない（画面遷移しない）
- [ ] プラン変更の **Fail** 時、ユーザーにエラートースト or インラインエラーが見える（`console.error` のみで済ませていない）
- [ ] プラン変更の **Success** 時の遷移先が `docs/plan-change-navigation-spec.md` と一致する
- [ ] `lifecycle.ts` がキャンセルを **throw** している（`return` で吸収していない）
- [ ] `router.push("/plans")` や `window.location.href = "/plans"` を新規追加していない（プラン画面への能動的な遷移を除く）

## 手動検証（関連シナリオ変更時）

`docs/plan-change-navigation-spec.md` 5 章「デグレード検証シナリオ」の該当ケースを手動で確認する。特に「ホーム パーソナル CTA → キャンセル」「salon 占い師選択 → キャンセル」は再発が多いため毎回確認。

---

## PR 作成時の明示事項

本ルール対象ファイルを変更した PR では、PR 説明に以下を必ず記載する。

```md
### プラン変更遷移仕様チェック（.claude/rules/plan-change-navigation.md）

- [ ] Cancel 時に現在地維持
- [ ] Fail 時に現在地維持 + ユーザー通知あり
- [ ] Success 遷移先が仕様書と一致
- [ ] 手動検証した該当シナリオ: T1 / T2 / ... （該当番号を記入）
```
