import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import path from "path";

export const runtime = "nodejs";

const TAROTISTS = ["Ariadne", "Sophia", "Clara", "Luna"] as const;

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
    const chars = "AIタロット占い人のと本格的なリーディングを体験しよう種以上スプレッドで";
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

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #0f0a1e 0%, #1e1b4b 50%, #2d1b69 100%)",
          fontFamily: fonts.length ? "NotoSansJP, sans-serif" : "sans-serif",
        }}
      >
        {/* 左: テキストエリア */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 50px",
            width: 700,
          }}
        >
          {/* タイトル */}
          <div style={{ fontSize: 52, fontWeight: 700, color: "white", lineHeight: 1.1, marginBottom: 22 }}>
            AI タロット占い
          </div>

          {/* 3枚扇形カード: 左右裏面・中央表面（DOM最後=最前面） */}
          <div style={{ position: "relative", display: "flex", width: 182, height: 130, marginBottom: 24 }}>
            {/* 左: 裏面 */}
            <img src={cardBackUrl} width={60} height={94}
              style={{ position: "absolute", left: 0, bottom: 0, borderRadius: 8, objectFit: "cover",
                       transform: "rotate(-12deg)", boxShadow: "0 4px 12px rgba(0,0,0,0.6)" }} />
            {/* 右: 裏面 */}
            <img src={cardBackUrl} width={60} height={94}
              style={{ position: "absolute", left: 118, bottom: 0, borderRadius: 8, objectFit: "cover",
                       transform: "rotate(12deg)", boxShadow: "0 4px 12px rgba(0,0,0,0.6)" }} />
            {/* 中央: 表面（最後に描画→最前面） */}
            <img src={cardFaceUrl} width={72} height={112}
              style={{ position: "absolute", left: 55, bottom: 0, borderRadius: 9, objectFit: "cover",
                       boxShadow: "0 6px 20px rgba(0,0,0,0.7)" }} />
          </div>

          {/* 説明 */}
          <div
            style={{
              fontSize: 26,
              color: "#c4b5fd",
              lineHeight: 1.5,
              marginBottom: 12,
            }}
          >
            8人のAI占い師と22種のスプレッドで
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#e2e8f0",
              lineHeight: 1.5,
              marginBottom: 40,
            }}
          >
            本格的なタロットリーディングを体験しよう
          </div>

          {/* プラットフォームバッジ */}
          <div style={{ display: "flex", gap: 12 }}>
            {["iOS", "Android"].map((p) => (
              <div
                key={p}
                style={{
                  background: "rgba(139, 92, 246, 0.3)",
                  border: "1px solid rgba(167, 139, 250, 0.6)",
                  borderRadius: 24,
                  padding: "8px 20px",
                  color: "#c4b5fd",
                  fontSize: 20,
                }}
              >
                {p}
              </div>
            ))}
          </div>
        </div>

        {/* 右: タロティスト画像 2x2 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "30px 30px 30px 10px",
            width: 500,
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <img
              src={images[0]}
              width={224}
              height={279}
              style={{ borderRadius: 16, objectFit: "cover", objectPosition: "top center" }}
            />
            <img
              src={images[1]}
              width={224}
              height={279}
              style={{ borderRadius: 16, objectFit: "cover", objectPosition: "top center" }}
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <img
              src={images[2]}
              width={224}
              height={279}
              style={{ borderRadius: 16, objectFit: "cover", objectPosition: "top center" }}
            />
            <img
              src={images[3]}
              width={224}
              height={279}
              style={{ borderRadius: 16, objectFit: "cover", objectPosition: "top center" }}
            />
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
    }
  );
}
