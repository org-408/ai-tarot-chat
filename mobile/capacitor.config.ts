import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.atelierflowlab.aitarotchat",
  appName: "AI Tarot Chat",
  webDir: "dist",
  plugins: {
    CapacitorHttp: {
      // ✅ false のまま維持:
      //   enabled: true にすると window.fetch() がネイティブ HTTP に差し替えられ、
      //   SSE ストリーミング（useChat）が React error #185 で中断される。
      //   GET リクエストの認証は http.ts で window.fetch() + Auth ヘッダーを
      //   明示的に送信する方式で対応済み。
      enabled: false,
    },
    Keyboard: {
      resize: "none",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
