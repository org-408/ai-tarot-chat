import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.AUTH_URL ?? "https://ariadne-ai.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/ja/", "/en/", "/privacy", "/terms"],
        disallow: [
          "/api/",
          "/admin/",
          "/auth/",
          "/salon",
          "/reading",
          "/personal",
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
