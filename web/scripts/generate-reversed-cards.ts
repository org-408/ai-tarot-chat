import { readdir, stat, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// タロットカード画像を 180° 回転させて逆位置用画像を生成する。
// mobile/public/cards/*.png → mobile/public/cards-reversed/*.png
//
// X (Twitter) 投稿に画像を添付する際は、CSS transform が使えず
// 物理的に回転された画像ファイルが必要なため、事前生成する。
//
// 使い方:
//   npm run cards:reversed              # 差分実行（入力より古い出力のみ再生成）
//   npm run cards:reversed -- --force   # 強制上書き

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = join(__dirname, "..", "..", "mobile", "public", "cards");
const OUTPUT_DIR = join(__dirname, "..", "..", "mobile", "public", "cards-reversed");

// 裏面は回転しても意味がないのでスキップ
const SKIP_FILES = new Set(["back.png", "back1.png", "back2.png"]);

async function main() {
  const force = process.argv.includes("--force");

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  const files = (await readdir(INPUT_DIR)).filter(
    (f) => f.endsWith(".png") && !SKIP_FILES.has(f),
  );

  let generated = 0;
  let skipped = 0;

  for (const file of files) {
    const inputPath = join(INPUT_DIR, file);
    const outputPath = join(OUTPUT_DIR, file);

    if (!force && existsSync(outputPath)) {
      const [inputStat, outputStat] = await Promise.all([
        stat(inputPath),
        stat(outputPath),
      ]);
      if (outputStat.mtimeMs >= inputStat.mtimeMs) {
        skipped++;
        continue;
      }
    }

    await sharp(inputPath).rotate(180).toFile(outputPath);
    generated++;
    console.log(`✓ ${file}`);
  }

  console.log(`\n生成: ${generated} 枚 / スキップ: ${skipped} 枚 / 合計: ${files.length} 枚`);
  console.log(`出力先: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
