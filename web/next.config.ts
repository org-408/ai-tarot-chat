import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // PR1: 旧マーケティングページ URL → [locale] 付きに 301 リダイレクト
      {
        source: "/pricing",
        destination: "/ja/pricing",
        permanent: true,
      },
      {
        source: "/download",
        destination: "/ja/download",
        permanent: true,
      },
      // PR2: 旧アプリページ URL (locale 付き) → locale なしに 301 リダイレクト
      {
        source: "/:locale(ja|en)/salon",
        destination: "/salon",
        permanent: true,
      },
      {
        source: "/:locale(ja|en)/reading",
        destination: "/reading",
        permanent: true,
      },
      {
        source: "/:locale(ja|en)/personal",
        destination: "/personal",
        permanent: true,
      },
      {
        source: "/:locale(ja|en)/history",
        destination: "/history",
        permanent: true,
      },
      {
        source: "/:locale(ja|en)/history/:id",
        destination: "/history/:id",
        permanent: true,
      },
      {
        source: "/:locale(ja|en)/tarotists",
        destination: "/tarotists",
        permanent: true,
      },
      {
        source: "/:locale(ja|en)/plans",
        destination: "/plans",
        permanent: true,
      },
      {
        source: "/:locale(ja|en)/settings",
        destination: "/settings",
        permanent: true,
      },
    ];
  },
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "googleusercontent.com",
      "graph.facebook.com",
      "platform-lookaside.fbsbx.com",
    ],
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

export default withNextIntl(nextConfig);
