/**
 * プラン変更遷移ルールの静的検査テスト
 *
 * 仕様: docs/plan-change-navigation-spec.md
 * ルール: .claude/rules/plan-change-navigation.md
 *
 * このテストの目的は、過去に繰り返しデグレードしているプラン変更後の遷移を
 * ファイル内容の静的検査で「禁止パターン＝あってはならない」「必須パターン＝
 * なくてはならない」として固定することで、新機能追加時に同じバグが再混入する
 * のを自動検出すること。
 *
 * 真の E2E（RevenueCat purchase flow の実 modal 操作）は RC SDK のモックが
 * 実装コスト・安定性の両面で割に合わないため、代替として静的検査を Playwright
 * 上で動かしている。
 *
 * 違反内容に応じて PR2〜6 の実装タスクで修正してグリーン化する設計。
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const WEB_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(WEB_ROOT, "..");

type ForbiddenCheck = {
  label: string;
  file: string;
  pattern: RegExp;
  reason: string;
};

type RequiredCheck = {
  label: string;
  file: string;
  pattern: RegExp;
  reason: string;
};

// ─── 禁止パターン ───────────────────────────────────────────────
// 「このコードが存在したらルール違反」
const FORBIDDEN: ForbiddenCheck[] = [
  {
    label: "W1: home-client Fail 時に /plans 強制遷移するのは禁止",
    file: "web/app/home-client.tsx",
    pattern: /window\.location\.href\s*=\s*["']\/plans["']/,
    reason:
      "購入失敗時に別画面へ遷移するのは仕様違反。home 維持してインラインエラーを表示する。" +
      "docs/plan-change-navigation-spec.md 3 章 W1 参照。",
  },
  {
    label: "W2: /tarotists ダイアログのアップグレードで /plans 遷移するのは禁止",
    file: "web/app/(app)/tarotists/page.tsx",
    pattern: /router\.push\(["']\/plans["']\)/,
    reason:
      "ダイアログ内アップグレードボタンはその場で purchase() を呼び、" +
      "Success/Cancel/Fail 共に /tarotists 維持（ダイアログ閉じる）。" +
      "/plans へ遷移すると購入後に元画面へ戻れない。W2 参照。",
  },
  {
    label: "W3: Web tarotist carousel の Fail 時に console.error のみは禁止",
    file: "web/components/reading/tarotist-carousel-portrait.tsx",
    pattern: /isUserCancelled\(e\)\)\s*console\.error\(e\)/,
    reason:
      "購入失敗時に console.error のみでユーザーへの通知がないのは UX 欠陥。" +
      "toast 等で失敗を明示する。W3 参照。",
  },
  {
    label: "W4: SelectionView から /plans への Link は dead code として禁止",
    file: "web/components/reading/selection-view.tsx",
    pattern: /href=["']\/plans["']/,
    reason:
      "/personal は hasPersonal ガードで home に redirect されるため、" +
      "プラン不足 Link は到達不能な dead code。削除する。W4 参照。",
  },
  {
    label: "W6: settings で /${locale}/plans に遷移するのは禁止（/plans に統一）",
    file: "web/app/(app)/settings/page.tsx",
    pattern: /router\.push\(`\/\$\{locale\}\/plans`\)/,
    reason: "他箇所と表記を揃える。W6 参照。",
  },
  {
    label: "M1: lifecycle キャンセル時に return で吸収するのは禁止",
    file: "mobile/src/lib/stores/lifecycle.ts",
    pattern: /purchaseError\?\.includes\(["']キャンセル["']\)\)[\s\S]{0,400}?return;/,
    reason:
      "キャンセルを throw せず return すると、呼び出し元は成功として扱い、" +
      "Cancel 時にも成功遷移ロジック（例: setPageType）が発火して誤遷移バグが出る。" +
      "PurchaseCancelledError を throw する。M1 参照。",
  },
];

// ─── 必須パターン ───────────────────────────────────────────────
// 「このコードが存在しなければルール違反」
const REQUIRED: RequiredCheck[] = [
  {
    label: "M1: lifecycle が PurchaseCancelledError を throw している",
    file: "mobile/src/lib/stores/lifecycle.ts",
    pattern: /throw\s+new\s+PurchaseCancelledError/,
    reason:
      "キャンセルは throw で上位に伝搬しなければならない。" +
      "PurchaseCancelledError クラスを定義し throw する。M1 参照。",
  },
  {
    label: "M2: handleChangePlan が options.onSuccess を受け取る",
    file: "mobile/src/app.tsx",
    pattern: /onSuccess\?\s*:\s*["']/,
    reason:
      "呼び出し元が成功時遷移先を宣言できるよう、options.onSuccess 引数を" +
      "対応させる（FREE 登録→履歴遷移などを汎用化）。M2 参照。",
  },
];

test.describe("プラン変更遷移ルール（static check）", () => {
  for (const { label, file, pattern, reason } of FORBIDDEN) {
    test(`禁止: ${label}`, () => {
      const path = resolve(REPO_ROOT, file);
      const src = readFileSync(path, "utf-8");
      const match = src.match(pattern);
      expect(
        match,
        [
          "",
          `[${label}]`,
          reason,
          `ファイル: ${file}`,
          match ? `該当: ${match[0].slice(0, 200)}` : "",
          "",
        ].join("\n"),
      ).toBeNull();
    });
  }

  for (const { label, file, pattern, reason } of REQUIRED) {
    test(`必須: ${label}`, () => {
      const path = resolve(REPO_ROOT, file);
      const src = readFileSync(path, "utf-8");
      expect(
        pattern.test(src),
        [
          "",
          `[${label}]`,
          reason,
          `ファイル: ${file}`,
          `必須パターン: ${pattern}`,
          "",
        ].join("\n"),
      ).toBe(true);
    });
  }
});
