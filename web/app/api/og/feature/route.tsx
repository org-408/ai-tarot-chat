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

// MonteCarlo 筆記体の「Ariadne」は build 時に @napi-rs/canvas で生成した PNG を埋め込む。
// 詳細: scripts/ensure-ariadne-script.ts 参照
// satori は筆記体フォントの GSUB (lookupType 6) を解釈できず例外 (→ 502) になるため、
// フォント解決を避けて画像として貼る。
const ariadneScript: { dataUrl: string; width: number; height: number } | undefined = (() => {
  try {
    const buf = readFileSync(path.join(process.cwd(), "public", "og-assets", "ariadne-script.png"));
    return {
      dataUrl: `data:image/png;base64,${buf.toString("base64")}`,
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
    };
  } catch {
    return undefined;
  }
})();

let cachedFont: ArrayBuffer | undefined;

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 3000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGoogleFont(cssUrl: string): Promise<ArrayBuffer | undefined> {
  try {
    const css = await fetchWithTimeout(cssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
    }).then((r) => r.text());
    const fontUrl = css.match(/src: url\(([^)]+)\) format/)?.[1];
    if (!fontUrl) return undefined;
    return await fetchWithTimeout(fontUrl).then((r) => r.arrayBuffer());
  } catch {
    return undefined;
  }
}

async function loadJapaneseFont(): Promise<ArrayBuffer | undefined> {
  if (cachedFont) return cachedFont;
  const chars = "AIタロット占い人の本格的なリーディングを体験しよう種スプレッド";
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(chars)}`;
  cachedFont = await fetchGoogleFont(cssUrl);
  return cachedFont;
}

const ARIADNE_DISPLAY_HEIGHT = 72;

export async function GET() {
  const images = TAROTISTS.map(getImageDataUrl);
  const cardBackUrl = getCardImageDataUrl("back");
  const cardFaceUrl = getCardImageDataUrl("0_fool");
  const fontData = await loadJapaneseFont();

  type FontOption = { name: string; data: ArrayBuffer; weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 };
  const fonts: FontOption[] = [];
  if (fontData) fonts.push({ name: "NotoSansJP", data: fontData, weight: 700 });

  const ariadneWidth = ariadneScript
    ? Math.round((ARIADNE_DISPLAY_HEIGHT * ariadneScript.width) / ariadneScript.height)
    : 0;

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
          background: "linear-gradient(135deg, #3d2472 0%, #6040a8 55%, #8b58d0 100%)",
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
          <div style={{ display: "flex", alignItems: "center", letterSpacing: "-0.5px" }}>
            {ariadneScript ? (
              <img
                src={ariadneScript.dataUrl}
                width={ariadneWidth}
                height={ARIADNE_DISPLAY_HEIGHT}
                style={{ marginRight: 10 }}
              />
            ) : (
              <span style={{ fontSize: 56, fontWeight: 400, color: "#87CEEB", marginRight: 10 }}>Ariadne</span>
            )}
            <span style={{ fontSize: 52, fontWeight: 700, color: "white" }}>- AI Tarot Chat</span>
          </div>
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
