import sharp from "sharp";
import path from "path";
import { readdirSync, statSync, writeFileSync } from "fs";

const PUBLIC = path.join(process.cwd(), "public");

const TARGETS: string[] = [
  ...readdirSync(path.join(PUBLIC, "tarotists"))
    .filter((f) => f.endsWith(".png"))
    .map((f) => path.join("tarotists", f)),
  "cards/back.png",
  "cards/0_fool.png",
];

async function optimize(relPath: string) {
  const abs = path.join(PUBLIC, relPath);
  const before = statSync(abs).size;
  const buf = await sharp(abs).png({ compressionLevel: 9, effort: 10 }).toBuffer();
  if (buf.length >= before) {
    console.log(`${relPath.padEnd(28)} skipped (already optimal)`);
    return;
  }
  writeFileSync(abs, buf);
  const pct = (100 - (buf.length * 100) / before).toFixed(1);
  console.log(
    `${relPath.padEnd(28)} ${(before / 1024).toFixed(1).padStart(8)}KB -> ${(buf.length / 1024)
      .toFixed(1)
      .padStart(8)}KB  (-${pct}%)`
  );
}

async function main() {
  for (const t of TARGETS) {
    await optimize(t);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
