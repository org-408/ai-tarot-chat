import type { MetadataRoute } from "next";
import { blogPostRepository } from "@/lib/server/repositories/blog-post";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.AUTH_URL ?? "https://ariadne-ai.app";
  const locales = ["ja", "en"];

  const marketingPaths = ["", "/pricing", "/download"];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of marketingPaths) {
      entries.push({
        url: `${baseUrl}/${locale}${path}`,
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1.0 : 0.8,
      });
    }
  }

  entries.push(
    { url: `${baseUrl}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.3 }
  );

  // 公開済みブログ記事
  try {
    const posts = await blogPostRepository.findPublished({ limit: 100 });
    for (const post of posts) {
      entries.push({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch {
    // DB接続失敗時はブログエントリなしで続行
  }

  return entries;
}
