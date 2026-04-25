#!/usr/bin/env node
// Apple 4.3(b) i18n 監査スクリプト (Web 版)
//
// Mobile 版 (mobile/scripts/i18n-audit.mjs) と用途は同じだが、Web は
// next-intl 形式 (useTranslations("ns") → t("key")) で namespace と key
// が分離するため、コード ↔ JSON のキー参照チェックは省略する。
//
// 【error: CI を落とす】
//   E1. en.json の値に日本語が混入していない (翻訳漏れ)
//   E2. en.json / ja.json の値に Apple 4.3(b) NG ワードが含まれていない
//   E3. Apple 審査員が踏み得るパス配下のソースに NG ワードが含まれていない
//       (= web/app/auth, web/app/privacy, web/app/terms, web/app/[locale],
//        web/app/delete-account, web/components/auth, web/components/marketing)
//
// 【warning: 表示するが CI は落とさない】
//   W1. ja.json と en.json のキー非対称
//       (Task 5-4 = (app)/ の i18n 化が未着手のため既存ギャップを許容。
//        4.3(b) 通過後に解消する)
//
// 実行: node scripts/i18n-audit.mjs
//       npm run lint:i18n

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MESSAGES_DIR = join(ROOT, "messages");
const JA_PATH = join(MESSAGES_DIR, "ja.json");
const EN_PATH = join(MESSAGES_DIR, "en.json");

// 監査対象ソースパス (Apple 審査員が踏み得るルート)
const REVIEWED_SOURCE_DIRS = [
  join(ROOT, "app/auth"),
  join(ROOT, "app/privacy"),
  join(ROOT, "app/terms"),
  join(ROOT, "app/delete-account"),
  join(ROOT, "app/[locale]"),
  join(ROOT, "components/auth"),
  join(ROOT, "components/marketing"),
];

// Apple 4.3(b) リジェクト対応で使ってはいけない英単語
const NG_WORD = /\b(fortune|fortune-?telling|predict(ion|s|or)?|horoscope|destiny|fate|zodiac)\b/i;
// ひらがな・カタカナ・CJK
const JA_CHAR = /[぀-ヿ㐀-鿿]/;

// en.json の値として日本語が許容されるキー (例: "言語" ラベル等)
const JA_ALLOWED_IN_EN = new Set([
  "settings.language",
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

function walk(dir, exts, excludeDirs = new Set()) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (excludeDirs.has(name)) continue;
    if (name === "node_modules" || name === ".next" || name === "dist") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full, exts, excludeDirs));
    else if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
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

const errors = [];
const warnings = [];

// W1. ja/en キー対称性 (warning のみ。Task 5-4 待ち)
for (const k of jaKeys) if (!enKeys.has(k)) warnings.push(`JA_ONLY      ${k}  (only in ja.json)`);
for (const k of enKeys) if (!jaKeys.has(k)) warnings.push(`EN_ONLY      ${k}  (only in en.json)`);

// E1. en.json に日本語が混入 (翻訳漏れ)
for (const [key, value] of enEntries) {
  if (typeof value !== "string") continue;
  if (JA_ALLOWED_IN_EN.has(key)) continue;
  if (JA_CHAR.test(value)) {
    errors.push(`JP_LEAK      ${key}: "${value}"`);
  }
}

// E2. en.json / ja.json に NG ワード
for (const [key, value] of enEntries) {
  if (typeof value !== "string") continue;
  if (NG_WORD.test(value)) errors.push(`NG_WORD_EN   ${key}: "${value}"`);
}
for (const [key, value] of jaEntries) {
  if (typeof value !== "string") continue;
  if (NG_WORD.test(value)) errors.push(`NG_WORD_JA   ${key}: "${value}"`);
}

// E3. 監査対象ソース内に NG ワードが含まれるリテラル文字列がないか
//    (行コメントは除外。JSX/TS 内で表面化する文字列を主な検出対象とする)
for (const dir of REVIEWED_SOURCE_DIRS) {
  const files = walk(dir, [".ts", ".tsx"]);
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      if (/^\s*\/\//.test(line)) return;
      if (NG_WORD.test(line)) {
        const rel = file.replace(ROOT + "/", "");
        errors.push(`NG_WORD_SRC  ${rel}:${i + 1}  ${line.trim()}`);
      }
    });
  }
}

// ──────────────────────────────────────────────────────────────
// Output
// ──────────────────────────────────────────────────────────────

if (warnings.length > 0) {
  console.log(`─── warnings (${warnings.length}, non-blocking) ───`);
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
  `i18n audit: OK (ja=${jaKeys.size} keys, en=${enKeys.size} keys, ` +
    `${warnings.length} warning(s), scanned ${REVIEWED_SOURCE_DIRS.length} source roots)`,
);
