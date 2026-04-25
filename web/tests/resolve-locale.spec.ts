/**
 * resolveLocale() の単体テスト
 *
 * Apple 4.3(b) 対策の locale 解決ロジックは、Privacy / Terms / Signin で
 * 共通使用される基幹コード (web/lib/utils/resolve-locale.ts)。優先順位の
 * 退行は審査員に EN 表示が出ない致命傷になるため、純粋関数として網羅検証。
 */

import { test, expect } from "@playwright/test";
import { resolveLocale } from "../lib/utils/resolve-locale";

test.describe("resolveLocale 優先順位", () => {
  test("?lang=en が最優先 (cookie / Accept-Language を上書き)", () => {
    expect(resolveLocale({ lang: "en" }, "ja", "ja-JP")).toBe("en");
  });

  test("?lang=ja が最優先 (cookie / Accept-Language を上書き)", () => {
    expect(resolveLocale({ lang: "ja" }, "en", "en-US,en;q=0.9")).toBe("ja");
  });

  test("?lang= が無いとき cookie を使う", () => {
    expect(resolveLocale({}, "en", "ja-JP")).toBe("en");
    expect(resolveLocale(undefined, "en", "ja-JP")).toBe("en");
    expect(resolveLocale({ lang: undefined }, "ja", "en-US")).toBe("ja");
  });

  test("?lang= も cookie も無いとき Accept-Language を使う", () => {
    expect(resolveLocale({}, undefined, "en-US,en;q=0.9")).toBe("en");
    expect(resolveLocale({}, undefined, "EN")).toBe("en");
  });

  test("Accept-Language が ja から始まる場合は ja", () => {
    expect(resolveLocale({}, undefined, "ja-JP,ja;q=0.9")).toBe("ja");
  });

  test("Accept-Language が en/ja のいずれでもない場合 default の ja", () => {
    expect(resolveLocale({}, undefined, "fr-FR,fr;q=0.9")).toBe("ja");
    expect(resolveLocale({}, undefined, "zh-CN")).toBe("ja");
  });

  test("全部 undefined / null なら default の ja", () => {
    expect(resolveLocale(undefined, undefined, undefined)).toBe("ja");
    expect(resolveLocale({}, undefined, null)).toBe("ja");
  });

  test("?lang= に不正値が来ても fallback が動く (cookie へ)", () => {
    expect(resolveLocale({ lang: "fr" }, "en", "ja-JP")).toBe("en");
    expect(resolveLocale({ lang: "" }, "en", "ja-JP")).toBe("en");
  });

  test("cookie に不正値が来ても fallback が動く (Accept-Language へ)", () => {
    expect(resolveLocale({}, "fr", "en-US")).toBe("en");
  });

  test("優先順位 通し: lang > cookie > Accept-Language > default", () => {
    // すべて指定されていれば lang が勝つ
    expect(resolveLocale({ lang: "en" }, "ja", "ja-JP")).toBe("en");
    // lang 不正 → cookie が勝つ
    expect(resolveLocale({ lang: "xx" }, "en", "ja-JP")).toBe("en");
    // lang/cookie 不正 → Accept-Language が勝つ
    expect(resolveLocale({ lang: "xx" }, "xx", "en-US")).toBe("en");
    // 全部 不正/null → default ja
    expect(resolveLocale({ lang: "xx" }, "xx", "fr-FR")).toBe("ja");
  });
});
