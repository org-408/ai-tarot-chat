#!/usr/bin/env node
// i18n 整合性監査スクリプト
//
// 以下を検出する:
//   1. コード内で参照されているキーが ja.json / en.json に存在しない
//   2. ja.json と en.json のキー対称性の崩れ
//   3. en.json の値に日本語が混入している (翻訳漏れ)
//   4. en.json の値に Apple 4.3(b) NG ワードが含まれている
//   5. ja.json の値に Apple 4.3(b) NG ワードが含まれている (念のため)
//   6. [警告] コードで使われていないキー
//
// 実行: node scripts/i18n-audit.mjs
//       npm run lint:i18n
//
// CI で検出したいエラー種別のみ exit 1、警告は exit 0 のまま。

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC_DIR = join(ROOT, "src");
const JA_PATH = join(SRC_DIR, "i18n/ja.json");
const EN_PATH = join(SRC_DIR, "i18n/en.json");

// Apple 4.3(b) リジェクト対応で英語 UI に使ってはいけない語彙。
// `fate` は `generate`, `fate(d)` のような単語に含まれ得るので word boundary で検出。
const NG_WORD = /\b(fortune|fortune-?telling|predict(ion|s|or)?|horoscope|destiny|fate|zodiac)\b/i;
const JA_CHAR = /[\u3040-\u30FF\u3400-\u9FFF]/;

// en.json の値として日本語が意図されているキー (短いキー名で指定)
const JA_ALLOWED_IN_EN = new Set([
  "langJa", // "日本語" ラベル
]);

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function flatten(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) out.push(...flatten(v, key));
    else out.push([key, v]);
  }
  return out;
}

function walk(dir, exts) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "scripts") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

function extractKeysFromCode() {
  const files = walk(SRC_DIR, [".ts", ".tsx"]);
  // `t("namespace.key")` or `i18n.t("namespace.key")`。
  // 単純な t("foo") は namespace 形式を強制 (namespace.key) することで
  // 動的 import パス等の false positive を除外する。
  const strictRe = /(?:^|[^.a-zA-Z_])t\(\s*"([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)"/g;
  const i18nRe = /i18n\.t\(\s*"([^"]+)"/g;
  const keys = new Set();
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(strictRe)) keys.add(m[1]);
    for (const m of src.matchAll(i18nRe)) keys.add(m[1]);
  }
  return keys;
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────

const ja = JSON.parse(readFileSync(JA_PATH, "utf8"));
const en = JSON.parse(readFileSync(EN_PATH, "utf8"));

const jaEntries = flatten(ja);
const enEntries = flatten(en);
const jaKeys = new Set(jaEntries.map(([k]) => k));
const enKeys = new Set(enEntries.map(([k]) => k));
const codeKeys = extractKeysFromCode();

const errors = [];
const warnings = [];

// 1. コードで参照されているキーが JSON に存在しない
for (const k of codeKeys) {
  if (!jaKeys.has(k)) errors.push(`MISSING_JA   ${k}  (used in code, not in ja.json)`);
  if (!enKeys.has(k)) errors.push(`MISSING_EN   ${k}  (used in code, not in en.json)`);
}

// 2. ja/en 非対称
for (const k of jaKeys) if (!enKeys.has(k)) errors.push(`JA_ONLY      ${k}  (only in ja.json)`);
for (const k of enKeys) if (!jaKeys.has(k)) errors.push(`EN_ONLY      ${k}  (only in en.json)`);

// 3. en.json に日本語が混入 (翻訳漏れ)
for (const [key, value] of enEntries) {
  if (typeof value !== "string") continue;
  const shortKey = key.split(".").pop();
  if (JA_CHAR.test(value) && !JA_ALLOWED_IN_EN.has(shortKey)) {
    errors.push(`JP_LEAK      ${key}: "${value}"`);
  }
}

// 4. en.json に NG ワード
for (const [key, value] of enEntries) {
  if (typeof value !== "string") continue;
  if (NG_WORD.test(value)) errors.push(`NG_WORD_EN   ${key}: "${value}"`);
}

// 5. ja.json にも念のため NG ワードチェック (英単語が混ざっていないか)
for (const [key, value] of jaEntries) {
  if (typeof value !== "string") continue;
  if (NG_WORD.test(value)) errors.push(`NG_WORD_JA   ${key}: "${value}"`);
}

// 6. 警告: ja.json にあるがコードで未使用のキー (common.* の汎用は除外)
for (const k of jaKeys) {
  if (k.startsWith("common.")) continue; // 汎用セットは意図的に残してよい
  if (!codeKeys.has(k)) warnings.push(`UNUSED       ${k}  (in ja.json, not referenced in code)`);
}

// ──────────────────────────────────────────────────────────────
// Output
// ──────────────────────────────────────────────────────────────

if (warnings.length > 0) {
  console.log("─── warnings ───");
  for (const w of warnings) console.log("  " + w);
  console.log("");
}

if (errors.length > 0) {
  console.log("─── errors ───");
  for (const e of errors) console.log("  " + e);
  console.log("");
  console.log(`i18n audit: ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
}

console.log(
  `i18n audit: OK (code=${codeKeys.size} keys, ja=${jaKeys.size}, en=${enKeys.size}, warnings=${warnings.length})`,
);
