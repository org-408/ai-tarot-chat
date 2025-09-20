import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // Google プロフィール画像のドメインを許可
    domains: [
      "lh3.googleusercontent.com", // Google プロフィール画像
      "googleusercontent.com", // Google画像全般
      "graph.facebook.com", // Facebook画像（将来用）
      "platform-lookaside.fbsbx.com", // Facebook画像（将来用）
    ],
    // リモート画像パターン設定
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        port: "",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
