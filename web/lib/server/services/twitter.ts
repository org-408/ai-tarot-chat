import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { TwitterApi } from "twitter-api-v2";

function getClient(): TwitterApi {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error(
      "Twitter API credentials are not configured. Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET."
    );
  }

  return new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret,
  });
}

// mediaPath は "/cards-reversed/0_fool.png" のようなパブリックパス。
// web/public/ 配下のファイルとして解決する。
async function resolveMediaAbsolutePath(mediaPath: string): Promise<string> {
  const normalized = mediaPath.startsWith("/") ? mediaPath.slice(1) : mediaPath;
  return join(process.cwd(), "public", normalized);
}

export async function postTweet(content: string, mediaPath?: string | null): Promise<string> {
  const client = getClient();

  if (mediaPath) {
    const absolutePath = await resolveMediaAbsolutePath(mediaPath);
    const buffer = await readFile(absolutePath);
    const mediaId = await client.v1.uploadMedia(buffer, { mimeType: "image/png" });
    const tweet = await client.v2.tweet(content, {
      media: { media_ids: [mediaId] },
    });
    return tweet.data.id;
  }

  const tweet = await client.v2.tweet(content);
  return tweet.data.id;
}

export function isTwitterConfigured(): boolean {
  return !!(
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_SECRET
  );
}
