---
paths:
  - "mobile/src/**"
---

# モバイルコーディングルール

> Capacitor 固有の制約（CapacitorHttp, SSE など）は `mobile.md` を参照。  
> このファイルはコーディングパターン（Service / Store / Hook / Repository）を扱う。

## Service 層 (`mobile/src/lib/services/`)

### クラス構造（必須パターン）

```typescript
export class FooService {
  async doSomething(params: InputType): Promise<ReturnType> {
    logWithContext("info", "[FooService] doSomething started", { ...params });
    try {
      const result = await apiClient.post<ReturnType>("/api/foo", params);
      logWithContext("info", "[FooService] doSomething succeeded", { result });
      return result;
    } catch (error) {
      logWithContext("error", "[FooService] doSomething failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error; // Service は必ず re-throw する。ハンドリングは Store に委ねる
    }
  }
}

export const fooService = new FooService(); // シングルトンを常にエクスポート
```

**ルール:**
- ログメッセージは `"[ClassName] description"` 形式
- HTTP 呼び出しは `apiClient` のみ使用（`window.fetch` / `CapacitorHttp` を直接叩かない）
- 認証不要の API: `apiClient.getWithoutAuth<T>()` / `apiClient.postWithoutAuth<T>()`
- 認証必要の API: `apiClient.get<T>()` / `apiClient.post<T>()`

## Store 層 (`mobile/src/lib/stores/`)

### Zustand + persist パターン（必須）

```typescript
interface FooState {
  // 状態
  isReady: boolean;
  data: SomeType | null;
  error: Error | null;

  // アクション
  init: () => Promise<void>;
  reset: () => void;
}

export const useFooStore = create<FooState>()(
  persist(
    (set) => ({
      // 初期状態
      isReady: false,
      data: null,
      error: null,

      init: async () => {
        logWithContext("info", "[FooStore] Initializing");
        set({ error: null }); // アクション開始時はエラーをクリア
        try {
          const data = await fooService.getData();
          set({ data, isReady: true });
        } catch (error) {
          set({
            isReady: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },

      reset: () => {
        set({ isReady: false, data: null, error: null });
      },
    }),
    {
      name: "foo-storage",
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const v = await storeRepository.get(name);
          return v ? JSON.stringify(v) : null;
        },
        setItem: async (name, value) => {
          await storeRepository.set(name, JSON.parse(value));
        },
        removeItem: async (name) => {
          await storeRepository.delete(name);
        },
      })),
    }
  )
);
```

**規則:**
- 状態とアクションの宣言ブロックを `// 状態` / `// アクション` コメントで区切る
- 全 store に `isReady: boolean`、`error: Error | null`、`reset: () => void` を持たせる
- エラーは必ず `Error` に正規化: `error instanceof Error ? error : new Error(String(error))`
- アクション開始時に `set({ error: null })` でエラーをクリア
- セッション中のみ必要なデータは `partialize` で永続化対象から除外する
- 大きなデータ（マスターデータ等）は `storeRepository` ではなく `filesystemRepository` を使用

## Hook 層 (`mobile/src/lib/hooks/`)

Hook は Store の薄いラッパーで、派生値の計算とインターフェースの整理を担う。

```typescript
export function useFoo() {
  const { isReady, data, error, init, reset } = useFooStore();

  return {
    isReady,
    error,
    // 派生値 — Store には持たせずここで計算
    displayName: data?.name ?? "Unknown",
    hasData: data !== null,
    // アクション
    init,
    reset,
  };
}
```

**ルール:**
- ファイル名: `use-*.ts`（例: `use-auth.ts`, `use-master.ts`）
- ビジネスロジックを書かない。Store / Service に委ねる
- `null` の安全なデフォルト値を提供する（例: `remaining ?? 0`）

## Repository 層 (`mobile/src/lib/repositories/`)

モバイルは Web と異なり、ローカル永続化に 2 種類の Repository を使い分ける。

### `StoreRepository` — 小さなデータ（トークン、設定）

```typescript
// @capacitor/preferences ベース（Key-Value ストア）
await storeRepository.get<TokenType>("auth-token");
await storeRepository.set("auth-token", tokenData);
await storeRepository.delete("auth-token");
await storeRepository.has("auth-token");
```

### `FilesystemRepository` — 大きなデータ（マスターデータ、キャッシュ）

```typescript
// @capacitor/filesystem ベース（JSON ファイル）
// 5 MB 上限あり、エラーは throw せず null を返す
await filesystemRepository.read<MasterData>("master-data");
await filesystemRepository.write("master-data", masterData);
```

**ルール:**
- `get()` のエラーはサイレントに `null` を返す（アプリクラッシュ防止）
- Repository を Service が直接使わず、Store が呼ぶ

## Plugin 層 (`mobile/src/lib/plugins/`)

Capacitor カスタムプラグインの登録パターン:

```typescript
// 1. インターフェース定義
export interface ResetPlugin {
  resetAppData(): Promise<{ success: boolean }>;
}

// 2. Web（開発用）モック
const ResetPluginMock: ResetPlugin = {
  resetAppData: async () => ({ success: true }),
};

// 3. registerPlugin — web モックを必ず指定
export const Reset = registerPlugin<ResetPlugin>("Reset", {
  web: () => Promise.resolve(ResetPluginMock),
});
```

## コンポーネント

**ファイル命名:** kebab-case（`chat-panel.tsx`, `salon-page.tsx`）  
**コンポーネント名:** PascalCase（`ChatPanel`, `SalonPage`）  
**Props インターフェース:** コンポーネント直上にインライン定義

```typescript
interface ChatPanelProps {
  onBack: () => void;           // コールバックは on* 命名
  isVisible?: boolean;          // boolean は is* / show* 命名
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ onBack, isVisible }) => {
  // ...
};
```

**スタイル:** Tailwind CSS のみ。CSS モジュール・inline style オブジェクト禁止  
（例外: `env(safe-area-inset-*)` など動的な値は `style={}` を使ってよい）

## HTTP クライアント

**`apiClient`（`mobile/src/lib/utils/api-client.ts`）のみ使用。** 直接 `window.fetch` / `CapacitorHttp` を呼ばない。

| メソッド | 用途 |
|---|---|
| `apiClient.get<T>(path)` | 認証付き GET |
| `apiClient.post<T>(path, body)` | 認証付き POST |
| `apiClient.getWithoutAuth<T>(path)` | 認証不要 GET（マスターデータ等） |
| `apiClient.postWithoutAuth<T>(path, body)` | 認証不要 POST（デバイス登録等） |

> GET では `Authorization` と `X-App-Token` の両方を送信する（Cloudflare が片方を除去する場合があるため）。

## エラーハンドリング

### カスタムエラークラス

```typescript
// HTTP エラー（mobile/src/lib/utils/http.ts）
class HttpError extends Error {
  status: number;       // 0 = ネットワーク障害
  isNetworkError(): boolean  // status === 0 or >= 500
  isAuthError(): boolean     // status 401 or 403
}

// AI チャットエラー（mobile/src/lib/utils/reading-chat-error.ts）
class ReadingChatError extends Error {
  readonly code: ReadingErrorCode | "UNKNOWN";
  readonly retryable: boolean;
}
```

### catch ブロックの書き方

```typescript
// Service: re-throw する
catch (error) {
  logWithContext("error", "[ClassName] Operation failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  throw error;
}

// Store: エラーを state にセット
catch (error) {
  set({
    error: error instanceof Error ? error : new Error(String(error)),
  });
}
```

### エラー表示

- Store の `error` 状態を Hook 経由でコンポーネントが読む
- リトライ可能エラー: 「もう一度試す」ボタンを表示
- 非リトライエラー: 「戻る」ボタンのみ表示
- Toast は保存失敗など一時的な通知に限定（Framer Motion `AnimatePresence` を使用）

## ロガー

```typescript
import { logWithContext } from "@/lib/logger/logger";

logWithContext("info" | "warn" | "error" | "debug", "[ClassName] message", {
  key: value,
});
```

- メッセージは必ず `"[ClassName] description"` 形式
- ロガー自体はエラーを throw しない（fire-and-forget）
- `source` は自動的に `"mobile"` が付与される
