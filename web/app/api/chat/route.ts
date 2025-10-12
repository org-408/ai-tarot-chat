import { ReadingCategory, Spread, Tarotist } from "@/../../shared/lib/types";
import { logWithContext } from "@/lib/logger/logger";
import { anthropic } from "@ai-sdk/anthropic";
import { groq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
import { ModelMessage, streamText } from "ai";

// プロバイダマッピング
const providers = {
  groq: groq("llama-3.3-70b-versatile"),
  openai: openai("gpt-5"),
  anthropic: anthropic("claude-sonnet-4-20250514"),
};

export async function POST(req: Request) {
  const {
    id,
    messages,
    tarotist,
    spread,
    category,
  }: {
    id: unknown;
    messages: ModelMessage[];
    tarotist: Tarotist;
    spread: Spread;
    category: ReadingCategory;
  } = await req.json();
  logWithContext("info", "[chat/route] POST req", {
    id,
    messages,
    tarotist,
    spread,
    category,
  });
  console.log(`[chat/route] `, { id, messages, tarotist, spread, category });
  const provider =
    tarotist && tarotist.provider ? tarotist.provider.toLowerCase() : "groq";

  const result = streamText({
    model: providers[provider as keyof typeof providers],
    messages,
    system: "あなたは熟練のタロット占い師です。",
  });

  // AI SDK v5の標準レスポンス形式
  return result.toUIMessageStreamResponse();
}
