import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import path from "path";

export const runtime = "nodejs";

const TAROTISTS = ["Ariadne", "Sophia", "Clara", "Luna", "Lily", "Stella", "Celine", "Gloria"] as const;

const imageCache = new Map<string, string>();

function getImageDataUrl(name: string): string {
  if (!imageCache.has(name)) {
    const filePath = path.join(process.cwd(), "public", "tarotists", `${name}.png`);
    const buffer = readFileSync(filePath);
    imageCache.set(name, `data:image/png;base64,${buffer.toString("base64")}`);
  }
  return imageCache.get(name)!;
}

function getCardImageDataUrl(cardName: string): string {
  const cacheKey = `card_${cardName}`;
  if (!imageCache.has(cacheKey)) {
    const filePath = path.join(process.cwd(), "public", "cards", `${cardName}.png`);
    const buffer = readFileSync(filePath);
    imageCache.set(cacheKey, `data:image/png;base64,${buffer.toString("base64")}`);
  }
  return imageCache.get(cacheKey)!;
}

let cachedFont: ArrayBuffer | undefined;

async function loadJapaneseFont(): Promise<ArrayBuffer | undefined> {
  if (cachedFont) return cachedFont;
  try {
    const chars = "AIタロット占い人の本格的なリーディングを体験しよう種スプレッド";
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(chars)}`;
    const css = await fetch(cssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
    }).then((r) => r.text());
    const fontUrl = css.match(/src: url\(([^)]+)\) format/)?.[1];
    if (!fontUrl) return undefined;
    cachedFont = await fetch(fontUrl).then((r) => r.arrayBuffer());
    return cachedFont;
  } catch {
    return undefined;
  }
}

export async function GET() {
  const images = TAROTISTS.map(getImageDataUrl);
  const cardBackUrl = getCardImageDataUrl("back");
  const cardFaceUrl = getCardImageDataUrl("0_fool");
  const fontData = await loadJapaneseFont();

  type FontOption = { name: string; data: ArrayBuffer; weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 };
  const fonts: FontOption[] = fontData
    ? [{ name: "NotoSansJP", data: fontData, weight: 700 }]
    : [];

  // 各キャラクター画像の幅・高さ (8人を横並び)
  const imgW = 112;
  const imgH = 140;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: 1024,
          height: 500,
          background: "linear-gradient(135deg, #0f0a1e 0%, #1e1b4b 55%, #2d1b69 100%)",
          fontFamily: fonts.length ? "NotoSansJP, sans-serif" : "sans-serif",
          gap: 0,
        }}
      >
        {/* タイトル */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 16,
          }}
        >
          {/* 3枚扇形カード（小）: 左右裏面・中央表面（DOM最後=最前面） */}
          <div style={{ position: "relative", display: "flex", width: 112, height: 76, flexShrink: 0 }}>
            {/* 左: 裏面 */}
            <img src={cardBackUrl} width={36} height={56}
              style={{ position: "absolute", left: 0, bottom: 0, borderRadius: 5, objectFit: "cover",
                       transform: "rotate(-12deg)", boxShadow: "0 3px 8px rgba(0,0,0,0.6)" }} />
            {/* 右: 裏面 */}
            <img src={cardBackUrl} width={36} height={56}
              style={{ position: "absolute", left: 72, bottom: 0, borderRadius: 5, objectFit: "cover",
                       transform: "rotate(12deg)", boxShadow: "0 3px 8px rgba(0,0,0,0.6)" }} />
            {/* 中央: 表面（最後に描画→最前面） */}
            <img src={cardFaceUrl} width={44} height={68}
              style={{ position: "absolute", left: 34, bottom: 0, borderRadius: 6, objectFit: "cover",
                       boxShadow: "0 5px 14px rgba(0,0,0,0.7)" }} />
          </div>
          <span
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.5px",
            }}
          >
            AI タロット占い
          </span>
        </div>

        {/* サブテキスト */}
        <div
          style={{
            fontSize: 22,
            color: "#c4b5fd",
            marginBottom: 24,
            letterSpacing: "0.5px",
          }}
        >
          8人のAI占い師と22種のスプレッドで本格的なタロットリーディングを体験しよう
        </div>

        {/* キャラクター 8人横並び */}
        <div style={{ display: "flex", gap: 10 }}>
          {images.map((src, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                borderRadius: 12,
                overflow: "hidden",
                border: "2px solid rgba(167, 139, 250, 0.5)",
                width: imgW,
                height: imgH,
              }}
            >
              <img
                src={src}
                width={imgW}
                height={imgH}
                style={{ objectFit: "cover", objectPosition: "top center" }}
              />
            </div>
          ))}
        </div>

        {/* バッジ */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {["iOS", "Android"].map((p) => (
            <div
              key={p}
              style={{
                background: "rgba(139, 92, 246, 0.3)",
                border: "1px solid rgba(167, 139, 250, 0.6)",
                borderRadius: 20,
                padding: "6px 18px",
                color: "#c4b5fd",
                fontSize: 18,
              }}
            >
              {p}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: 1024,
      height: 500,
      fonts,
    }
  );
}
