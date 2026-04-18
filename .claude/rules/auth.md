---
paths:
  - "web/auth.ts"
  - "web/proxy.ts"
  - "web/app/api/auth/**"
  - "web/app/api/oauth/**"
  - "web/app/api/device/**"
  - "web/lib/server/services/auth.ts"
  - "web/lib/server/repositories/auth.ts"
---

# 認証・認可ルール

## 認証フロー全体像

```
[OAuth Login]
  └→ NextAuth.js → User + Account レコード作成
       └→ JWT 発行 (clientId / deviceId / provider を含む)

[モバイル向けチケット認証]
  POST /api/auth/ticket  → ワンタイムチケット発行 (一度しか使えない)
  POST /api/auth/exchange → チケット → JWT 交換

[デバイス登録]
  POST /api/device/register → Device レコード作成・更新 → ゲスト Client 作成
```

## JWT ペイロード

NextAuth.js の JWT には以下が含まれる:

```typescript
{
  sub: string,        // User.id
  clientId: string,   // Client.id
  deviceId: string,   // Device.deviceId (UUID)
  provider: string,   // "google" | "apple"
  name: string,
  email: string,
  image: string,
}
```

## Cookie 設定

```typescript
// auth.ts
cookies: {
  sessionToken: {
    options: {
      sameSite: "none",  // モバイルアプリからのクロスサイトリクエスト対応
      secure: true,
    }
  }
}
```

`sameSite: "none"` は必須。`"lax"` や `"strict"` に変えるとモバイルアプリから認証が通らなくなる。

## API Route での認証チェック

```typescript
// Authorization ヘッダーから Bearer トークンを取得して検証
const authHeader = req.headers.get("Authorization");
const token = authHeader?.replace("Bearer ", "");
if (!token) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const payload = await authService.verifyToken(token);
```

## ゲストユーザー vs 認証済みユーザー

| | ゲスト | 認証済み |
|---|---|---|
| 識別方法 | `Device.deviceId` (UUID) | `Client.userId` (User.id) |
| `Client.userId` | `null` | User.id が入る |
| `Client.isRegistered` | `false` | `true` |

ゲストユーザーが OAuth ログインすると既存の `Client` に `userId` と `isRegistered: true` が設定される。

## ワンタイムチケット

`UsedTicket` テーブルで使用済み管理。一度使ったチケットは再利用不可。

```typescript
// チケット検証時
const isUsed = await prisma.usedTicket.findUnique({
  where: { ticketHash: hash }
});
if (isUsed) {
  return NextResponse.json({ error: "Ticket already used" }, { status: 401 });
}
```

## セッション maxAge

```typescript
// auth.ts
session: { maxAge: 30 * 24 * 60 * 60 }  // 30 日
```

## NextAuth.js のバージョンに注意

`next-auth@5.0.0-beta.29` (Auth.js 5) を使用。v4 と API が異なる。

```typescript
// v5 での session 取得
import { auth } from "@/auth";
const session = await auth();

// v4 では getServerSession() だったが v5 では auth() を使う
```
