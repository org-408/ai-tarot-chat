import sharp from "sharp";
import path from "path";
import { mkdirSync, readdirSync } from "fs";

const PUBLIC = path.join(process.cwd(), "public");
const OUT = path.join(PUBLIC, "og-assets");

mkdirSync(path.join(OUT, "tarotists"), { recursive: true });
mkdirSync(path.join(OUT, "cards"), { recursive: true });

async function resize(src: string, dest: string, w: number, h: number) {
  await sharp(src)
    .resize(w, h, { fit: "cover", position: "top" })
    .png({ compressionLevel: 9, quality: 85 })
    .toFile(dest);
  console.log(`${path.basename(src)} -> ${path.relative(PUBLIC, dest)} (${w}x${h})`);
}

async function main() {
  const tarotists = readdirSync(path.join(PUBLIC, "tarotists")).filter((f) => f.endsWith(".png"));
  for (const file of tarotists) {
    await resize(
      path.join(PUBLIC, "tarotists", file),
      path.join(OUT, "tarotists", file),
      448,
      560
    );
  }

  await resize(
    path.join(PUBLIC, "cards", "back.png"),
    path.join(OUT, "cards", "back.png"),
    120,
    188
  );
  await resize(
    path.join(PUBLIC, "cards", "0_fool.png"),
    path.join(OUT, "cards", "0_fool.png"),
    144,
    224
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
