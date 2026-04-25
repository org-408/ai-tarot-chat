import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.AUTH_URL ?? "https://ariadne-ai.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/ja/", "/en/", "/blog", "/blog/", "/privacy", "/terms"],
        disallow: [
          "/api/",
          "/admin/",
          "/auth/",
          "/quick",
          "/personal",
          "/clara",
          "/history",
          "/tarotists",
          "/plans",
          "/settings",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
