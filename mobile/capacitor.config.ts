import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.atelierflowlab.aitarotchat",
  appName: "AI Tarot Chat",
  webDir: "dist",
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
    Keyboard: {
      resize: "none",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
