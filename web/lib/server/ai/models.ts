import { anthropic } from "@ai-sdk/anthropic";
import { cerebras } from "@ai-sdk/cerebras";
import { deepinfra } from "@ai-sdk/deepinfra";
import { google } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { groq } from "@ai-sdk/groq";
import { mistral } from "@ai-sdk/mistral";
import { openai } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider-v2";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Render の関数切断対策にも有効

// Home Server 用のプロバイダ追加
const ollama = createOllama({
  baseURL: "https://ariadne-llm.com/api",
  headers: {
    "X-API-Key": process.env.ARIADNE_API_KEY!,
  },
});

export const homeProviders = {
  gpt5nano: ollama("llama3.1:8b-instruct-q8_0"), // 微妙
  gemini25: ollama("llama3.1:8b-instruct-fp16"), // 微妙
  gemini25pro: ollama("qwen3:14b-q4_K_M"), // 行けそう？
  claude_h: ollama("qwen3:14b-q8_0"), // やや遅い
  gpt41: ollama("gemma3:12b"), // 良好
  gpt5: ollama("gemma3:27b"), // 遅い
  claude_s: ollama("gpt-oss:latest"), // 微妙
  google: deepinfra("openai/gpt-oss-120b"),
};

export const homeFreeProviders = {
  gpt5nano: mistral("open-mistral-nemo"),
  gemini25: ollama("qwen3:14b-q4_K_M"), // 行けそう？
  gemini25pro: mistral("mistral-small-latest"),
  claude_h: cerebras("gpt-oss-120b"),
  gpt41: cerebras("llama-3.3-70b"),
  gpt5: groq("llama-3.3-70b-versatile"),
  claude_s: groq("openai/gpt-oss-120b"),
  google: ollama("gemma3:12b"), // 良好
};

// Google Vertex AI用の認証設定
const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT!,
  location: process.env.GOOGLE_VERTEX_LOCATION!,
  googleAuthOptions: {
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL!,
      // 重要: \n を実際の改行に変換
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    },
  },
});

// プロバイダマッピング
export const providers = {
  gpt5nano: openai("gpt-5-nano"),
  gemini25: vertex("gemini-2.5-flash"),
  gemini25pro: vertex("gemini-2.5-pro"),
  claude_h: anthropic("claude-haiku-4-5"),
  gpt41: openai("gpt-4.1"),
  gpt5: openai("gpt-5"),
  claude_s: anthropic("claude-sonnet-4-5"),
  google: google("gemini-2.5-pro"),
};

export const freeProviders = [
  { groq1: groq("openai/gpt-oss-120b"), ratio: 25, enalbed: true }, // 250K TPM / 1K RPM 月単位の制限は表向きはない
  { groq2: groq("llama-3.3-70b-versatile"), ratio: 25, enalbed: true }, // 300K TPM / 1K RPM 月単位の制限は表向きはない
  { cerebras1: cerebras("gpt-oss-120b"), ratio: 15, enalbed: true }, // 60K TPM / 1M TPH / 1M TPD / 30 RPM / 90 RPH / 14.4K RPD 月単位の制限は表向きはない
  { cerebras2: cerebras("llama-3.3-70b"), ratio: 15, enalbed: true }, // 60K TPM / 1M TPH / 1M TPD / 30 RPM / 90 RPH / 14.4K RPD 月単位の制限は表向きはない
  { deepinfra1: deepinfra("openai/gpt-oss-120b"), ratio: 10, enalbed: true },
  {
    deepinfra2: deepinfra("meta-llama/Llama-3.3-70B-Instruct"),
    ratio: 0,
    enalbed: true,
  },
  { mistral1: mistral("mistral-small-latest"), ratio: 5, enalbed: true },
  { mistral2: mistral("open-mistral-nemo"), ratio: 5, enalbed: true },
];

export async function selectProvider() {
  // ランダムにフリープロバイダを選択するロジックをここに実装
  const ratioSum = freeProviders.reduce((sum, p) => sum + p.ratio, 0);
  const rand = Math.random() * ratioSum;
  let cumulative = 0;
  for (const providerObj of freeProviders) {
    cumulative += providerObj.ratio;
    if (rand < cumulative) {
      return Object.values(providerObj)[0];
    }
  }
  // フォールバック
  return freeProviders[0];
}
