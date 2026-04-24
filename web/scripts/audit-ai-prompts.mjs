#!/usr/bin/env node
// Phase 2.1 — AI prompt モジュールの NG ワード監査。
//
// Apple 4.3(b) 対応として、英語 AI prompt に以下の語彙が含まれないことを検証:
//   fortune / fortune-telling / predict / prediction / horoscope /
//   destiny / fate / zodiac
//
// 対象: web/lib/server/ai/prompts/*-en.ts, personas-en.ts, labels-en.ts
// 実行: node scripts/audit-ai-prompts.mjs
//       npm run lint:prompts

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PROMPT_DIR = join(ROOT, "lib/server/ai/prompts");

const NG_WORD =
  /\b(fortune|fortune-?telling|predict(ion|s|or)?|horoscope|destiny|fate|zodiac)\b/i;

const files = readdirSync(PROMPT_DIR)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => join(PROMPT_DIR, f));

const errors = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  // コード部分と文字列リテラル/コメントを区別しない単純スキャン。
  // コメント内で NG ワードを「禁止例」として列挙するとヒットするため、
  // コメント行 (// ... / * ...) はスキップして false positive を避ける。
  const lines = src.split("\n");
  let inBlockComment = false;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (inBlockComment) {
      if (line.includes("*/")) {
        inBlockComment = false;
        line = line.slice(line.indexOf("*/") + 2);
      } else {
        continue;
      }
    }
    if (line.includes("/*")) {
      const before = line.slice(0, line.indexOf("/*"));
      const rest = line.slice(line.indexOf("/*") + 2);
      inBlockComment = !rest.includes("*/");
      line = before;
    }
    // 行コメントは除外
    const commentStart = line.indexOf("//");
    if (commentStart !== -1) {
      line = line.slice(0, commentStart);
    }
    const match = line.match(NG_WORD);
    if (match) {
      const rel = file.replace(ROOT + "/", "");
      errors.push(`  NG_WORD   ${rel}:${i + 1}  matched "${match[0]}"  in: ${line.trim()}`);
    }
  }
}

if (errors.length > 0) {
  console.log("─── errors ───");
  for (const e of errors) console.log(e);
  console.log("");
  console.log(`ai-prompt audit: ${errors.length} error(s)`);
  process.exit(1);
}

console.log(`ai-prompt audit: OK (${files.length} files scanned)`);
