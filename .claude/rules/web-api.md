---
paths:
  - "web/app/api/**"
  - "web/lib/server/services/**"
  - "web/lib/server/repositories/**"
  - "web/lib/server/validators/**"
  - "web/auth.ts"
  - "web/proxy.ts"
---

# Web API 開発ルール

## 呼び出し階層

Route Handler → `services/` → `repositories/` の順を厳守。

- **Route Handler** (`app/api/*/route.ts`): リクエスト受信・レスポンス返却のみ。ビジネスロジックを書かない
- **`services/`**: ビジネスロジック。Prisma クライアント (`prisma`) を直接使わない
- **`repositories/`**: Prisma を使ったデータアクセスのみ

```typescript
// ✅ 正しい
// route.ts → service → repository
const client = await clientService.getByDeviceId(deviceId);

// ❌ NG: Route Handler で Prisma を直接叩く
const client = await prisma.client.findUnique({ where: { deviceId } });
```

## API Route Handler の書き方

```typescript
// app/api/xxx/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // バリデーション → サービス呼び出し → レスポンス
    const result = await someService.doSomething(body);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("...", { error });
    return NextResponse.json({ error: "..." }, { status: 500 });
  }
}
```

## 認証トークンの取得

```typescript
// Authorization ヘッダーから JWT を取得
const authHeader = req.headers.get("Authorization");
const token = authHeader?.replace("Bearer ", "");
```

## CORS について

`proxy.ts` で一括処理済み。個別の Route Handler に CORS ヘッダーを追加しない。

## ゲストユーザーへの対応

`Client.userId` が null のケースがゲスト。認証必須の処理では必ずチェック:

```typescript
if (!client.userId) {
  return NextResponse.json({ error: "Login required" }, { status: 401 });
}
```

## ログ

`web/lib/server/logger/` の Winston ロガーを使う。`console.log` は使わない。

```typescript
import { logger } from "@/lib/server/logger";
logger.info("message", { metadata });
logger.error("message", { error });
```

## レスポンス形式

- 成功: `NextResponse.json(data)` (status 200)
- 作成: `NextResponse.json(data, { status: 201 })`
- 認証エラー: `{ status: 401 }`
- 権限エラー: `{ status: 403 }`
- 不正入力: `{ status: 400 }`
- サーバーエラー: `{ status: 500 }`
