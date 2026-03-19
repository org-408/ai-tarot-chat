import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";
import { defineConfig } from "vite";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as {
  version: string;
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // package.json の version をビルド時定数として埋め込む
    // ネイティブ環境では App.getInfo() が優先される（web/開発時フォールバック）
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
