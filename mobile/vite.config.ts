import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import path from "path";
import { defineConfig } from "vite";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as {
  version: string;
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared"),
    },
    // shared/ ディレクトリ配下のファイルも mobile の node_modules の React を参照させる
    dedupe: ["react", "react-dom", "framer-motion"],
  },
  define: {
    // package.json の version をビルド時定数として埋め込む
    // ネイティブ環境では App.getInfo() が優先される（web/開発時フォールバック）
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    // Capacitor ネイティブシェル内に全 JS がバンドル済みのため、
    // Web 的な「500kB 超えでダウンロードが遅い」警告はこのプロジェクトでは
    // 実害がない。警告ラインを 1000kB に引き上げる。
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/src/assets/master-data.ts")) {
            return "master-data";
          }

          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("/framer-motion/")) {
            return "motion-vendor";
          }

          if (
            id.includes("/@ai-sdk/") ||
            id.includes("/ai/") ||
            id.includes("/react-markdown/") ||
            id.includes("/remark-gfm/") ||
            id.includes("/remark-breaks/")
          ) {
            return "chat-vendor";
          }

          if (
            id.includes("/embla-carousel-react/") ||
            id.includes("/embla-carousel-auto-height/")
          ) {
            return "carousel-vendor";
          }

          if (id.includes("/lucide-react/")) {
            return "icon-vendor";
          }

          if (id.includes("/@uiw/react-json-view/")) {
            return "debug-vendor";
          }

          return undefined;
        },
      },
    },
  },
});
