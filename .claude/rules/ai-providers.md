---
paths:
  - "web/lib/server/ai/**"
  - "web/app/api/readings/**"
---

# AI プロバイダ設定ルール

## プロバイダ構成の全体像

```
models.ts
├── providers          # 有料ユーザー向け (OpenAI / Vertex AI / Anthropic)
├── freeProviders      # 無料ユーザー向け (Groq / Cerebras / DeepInfra / Mistral)
├── homeProviders      # ホームサーバー ariadne-llm.com 経由
└── homeFreeProviders  # ホームサーバー経由の無料代替
```

## Tarotist モデルキーと実際のモデル対応

`Tarotist.model` カラムのキーが以下に対応:

| キー | 有料 (`providers`) | 無料 (`freeProviders`) |
|---|---|---|
| `gpt5nano` | `openai/gpt-5-nano` | `mistral-small-latest` |
| `gemini25` | `vertex/gemini-2.5-flash` | `mistral-small-latest` |
| `gemini25pro` | `vertex/gemini-2.5-pro` | `gemini-2.5-flash-lite` |
| `claude_h` | `claude-haiku-4-5` | `llama-3.3-70b-versatile` (Groq) |
| `gpt41` | `gpt-4.1` | `gemini-2.5-flash` |
| `gpt5` | `gpt-5` | `openai/gpt-oss-120b` (Groq) |
| `claude_s` | `claude-sonnet-4-5` | `openai/gpt-oss-120b` (Groq) |
| `google` | `gemini-2.5-pro` | `gemma3:12b` (Ollama) |

## ホームサーバーの判定

`Tarotist.provider` フィールドで使用プロバイダを判断:
- `"home"` → `homeProviders` / `homeFreeProviders` を使用
- それ以外 → `providers` / `freeProviders` を使用

## 無料プロバイダの選択ロジック

`selectProvider()` 関数が `ratio` プロパティで加重ランダム選択。
- `ratio: 0` = 無効化（テスト中・不安定なプロバイダに使う）
- 合計 ratio の比率で選択確率が決まる

```typescript
// ratio 変更例: Groq の比率を上げたい場合
{ groq1: groq("..."), ratio: 40, enalbed: true },  // 40%
{ groq2: groq("..."), ratio: 30, enalbed: true },  // 30%
```

## maxDuration の設定

```typescript
export const maxDuration = 60;
```

Render.com の無料プランは関数のタイムアウトが短いため 60 秒に設定。変更不要。

## GOOGLE_PRIVATE_KEY の扱い

Vertex AI 認証に使う秘密鍵は `.env` ファイルで `\n` が文字列になっていることがあるため、コード内で変換済み:

```typescript
private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
```

この変換を削除しないこと。

## ストリーミングレスポンス

AI リーディング API は SSE ストリーミングを使用。`streamText()` (Vercel AI SDK) を利用:

```typescript
import { streamText } from "ai";
const result = streamText({ model, messages, ... });
return result.toDataStreamResponse();
```

## 新しいプロバイダを追加する手順

1. `web/package.json` に `@ai-sdk/<provider>` を追加
2. `models.ts` に import と定義を追加
3. `providers` または `freeProviders` にキーを追加
4. DB の `Tarotist` レコードの `model` カラムを対応するキーに設定
