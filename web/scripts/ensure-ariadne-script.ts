/**
 * OG 画像で使う「Ariadne」の筆記体 PNG を生成する。
 *
 * 背景: satori (next/og が内部で使うレンダリングエンジン) は MonteCarlo のような
 * 筆記体フォントの GSUB テーブル (lookupType 6) を解釈できず例外を投げる。
 * そのため MonteCarlo をランタイムで satori に直接渡すと OG ルートが 502 を返す。
 *
 * 対策として MonteCarlo での「Ariadne」描画は build 時に @napi-rs/canvas で
 * 透過 PNG 化してしまい、ランタイムの satori には単なる画像として貼る。
 *
 * prebuild フックから呼ばれる。PNG が既に存在すれば何もしない (idempotent)。
 */
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

const TEXT = "Ariadne";
const COLOR = "#87CEEB";
const FONT_SIZE = 256; // 実表示 ~64px に対して 4x で書き出し、retina 縮小耐性を確保
const PADDING = 24;

const OUT = path.join(process.cwd(), "public", "og-assets", "ariadne-script.png");

async function fetchMonteCarloFont(): Promise<Buffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=MonteCarlo&text=${encodeURIComponent(TEXT)}`;
  const css = await fetch(cssUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
  }).then((r) => r.text());
  const fontUrl = css.match(/src: url\(([^)]+)\) format/)?.[1];
  if (!fontUrl) {
    throw new Error(`Cannot parse font URL from Google Fonts CSS:\n${css}`);
  }
  const buf = await fetch(fontUrl).then((r) => r.arrayBuffer());
  return Buffer.from(buf);
}

async function main() {
  if (existsSync(OUT)) {
    console.log(`[ensure-ariadne-script] skip (${path.relative(process.cwd(), OUT)} exists)`);
    return;
  }

  const fontBuf = await fetchMonteCarloFont();
  const fontPath = path.join("/tmp", `MonteCarlo-${process.pid}.ttf`);
  writeFileSync(fontPath, fontBuf);
  GlobalFonts.registerFromPath(fontPath, "MonteCarlo");

  // 一度サイズ計測してからキャンバスを切る
  const probe = createCanvas(10, 10).getContext("2d");
  probe.font = `${FONT_SIZE}px MonteCarlo`;
  const m = probe.measureText(TEXT);
  const ascent = Math.ceil(m.actualBoundingBoxAscent);
  const descent = Math.ceil(m.actualBoundingBoxDescent);
  const textWidth = Math.ceil(m.width);
  const textHeight = ascent + descent;

  const canvasW = textWidth + PADDING * 2;
  const canvasH = textHeight + PADDING * 2;

  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext("2d");
  ctx.font = `${FONT_SIZE}px MonteCarlo`;
  ctx.fillStyle = COLOR;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(TEXT, PADDING, PADDING + ascent);

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, canvas.toBuffer("image/png"));
  console.log(
    `[ensure-ariadne-script] generated ${path.relative(process.cwd(), OUT)} (${canvasW}x${canvasH})`
  );
}

main().catch((e) => {
  console.error("[ensure-ariadne-script] FAILED:", e);
  process.exit(1);
});
