---
paths:
  - "web/app/**"
  - "web/components/**"
---

# Web コンポーネント・Server Actions ルール

## Server Component vs Client Component

### 判断基準

| 状況 | ディレクティブ | 理由 |
|---|---|---|
| `useState` / `useEffect` / `useRouter` などを使う | `"use client"` 必須 | React フック |
| `onClick` などのイベントハンドラを直接持つ | `"use client"` 必須 | ブラウザイベント |
| `usePathname` / `useSearchParams` を使う | `"use client"` 必須 | Client-only フック |
| DB データを直接 `await` で取得する | ディレクティブなし（Server） | async component |
| `auth()` / `adminAuth()` を呼ぶ | ディレクティブなし（Server） | サーバー専用 |
| `logWithContext` をサーバーロガーから使う | ディレクティブなし（Server） | Node.js 専用 |

### ページの分割パターン（必須）

インタラクションが必要なページは必ず「Server Component ＋ Client Component」に分割する。

```
app/(admin)/admin/(protected)/clients/
  page.tsx              ← Server Component: データ取得・認証チェック
  clients-page-client.tsx ← "use client": 状態管理・インタラクション
```

**`page.tsx`（Server Component）の責務:**
```typescript
// 認証チェック
await assertAdminSession();  // throws if not admin

// データ取得（Prisma or Service）
const clients = await clientService.listClients();

// 日付は ISO 文字列に変換してから渡す（Date は Client に渡せない）
const rows = clients.map((c) => ({
  ...c,
  createdAt: c.createdAt.toISOString(),
  lastLoginAt: c.lastLoginAt?.toISOString() ?? null,
}));

return <ClientsPageClient clients={rows} />;
```

**`*-page-client.tsx`（Client Component）の責務:**
```typescript
"use client";
// props は全て serializable な型（Date → string 変換済み）
type ClientRow = { createdAt: string; lastLoginAt: string | null; ... };

interface ClientsPageClientProps { clients: ClientRow[]; }

export function ClientsPageClient({ clients }: ClientsPageClientProps) {
  const [selected, setSelected] = useState<string | null>(null);
  // ...
}
```

## Server Actions (`actions.ts`)

### 構造ルール

```typescript
"use server";

import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { someService } from "@/lib/server/services";
import { revalidatePath } from "next/cache";

export async function doSomethingAction(input: InputType) {
  try {
    await assertAdminSession();        // 1. 認証チェック（常に最初）
    await someService.doSomething(input); // 2. Service 経由（Prisma 直叩き禁止）
    revalidatePath("/admin/...");       // 3. キャッシュ無効化
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "処理に失敗しました",
    };
  }
}
```

**ルール:**
- `"use server"` は必ずファイル先頭
- 必ず `await assertAdminSession()` を最初に呼ぶ
- 戻り値は `{ ok: true }` または `{ ok: false, error: string }` — throw しない
- ミューテーション後は必ず `revalidatePath()` を呼ぶ
- Prisma を直接使わない。Service 層を経由する

## コンポーネントの命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| ファイル名 | kebab-case | `chat-view.tsx`, `tarotist-selector.tsx` |
| コンポーネント名 | PascalCase | `ChatView`, `TarotistSelector` |
| Props 型名 | `コンポーネント名 + Props` | `ChatViewProps` |
| Page コンポーネント | `page.tsx` + `*-page-client.tsx` | `clients-page-client.tsx` |

## ロガーのインポート

**サーバー側コンポーネント・API Route では:**
```typescript
import { logWithContext } from "@/lib/server/logger/logger";
```

**クライアント側コンポーネントでは:**
```typescript
import { logWithContext } from "@/lib/client/logger/logger";
```

同名だが別実装。混在させると Node.js 専用モジュールがブラウザに混入してビルドエラーになる。

## 管理者ページの認証

```typescript
// app/(admin)/admin/(protected)/layout.tsx または page.tsx
import { assertAdminSession } from "@/lib/server/utils/admin-guard";

// page.tsx (Server Component)
export default async function AdminPage() {
  await assertAdminSession(); // throws → (protected)/layout で catch
  // ...
}

// API Route Handler
export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;
  // ...
}
```

## 日付の取り扱い

Server → Client Component のデータ渡しで `Date` オブジェクトはシリアライズ不可。必ず変換する。

```typescript
// ✅ page.tsx で変換してから渡す
const serialized = {
  ...record,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt?.toISOString() ?? null,
};

// ✅ Client Component で受け取る
type RecordRow = { createdAt: string; updatedAt: string | null };
```

## i18n（next-intl）

Web フロントエンドの UI テキストは必ず `web/messages/ja.json` に登録する。

```typescript
// Server Component / Client Component 共通
import { useTranslations } from "next-intl"; // Client Component
import { getTranslations } from "next-intl/server"; // Server Component

const t = useTranslations("salon");
const label = t("startReading"); // ← ja.json に事前登録必須
```

**ルール:**
- UI テキストを書いたターンで必ず `ja.json` を同時更新（後回し禁止）
- ネスト 2 階層まで: `namespace.key`（例: `salon.startReading`）
- 変数は `{variable}` 形式（`{{variable}}` は Turbopack で動作しない）
- shared コンポーネントには `useTranslations` を使わない（文字列を props で受け取る）
