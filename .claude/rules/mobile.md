---
paths:
  - "mobile/**"
  - "mobile/src/**"
---

# モバイルアプリ (Capacitor) 開発ルール

## 絶対に変更してはいけない設定

### CapacitorHttp は必ず `false`

```typescript
// mobile/capacitor.config.ts
plugins: {
  CapacitorHttp: {
    enabled: false,  // ← 絶対に true にしない
  }
}
```

`true` にすると `window.fetch()` がネイティブ HTTP に置換され、AI リーディングの SSE ストリーミング (`useChat`) が **React error #185** で中断する。HTTP 認証ヘッダーは `lib/plugins/http.ts` で明示的な fetch + Authorization ヘッダーで対応済み。

### キーボード設定

```typescript
Keyboard: {
  resize: "none",        // チャット入力時のレイアウト崩れを防ぐ
  resizeOnFullScreen: true,
}
```

## ビルド・同期の手順

```bash
cd mobile

# 開発中
npm run dev              # ブラウザで確認 (http://localhost:5173)

# ネイティブビルド
npm run build            # dist/ に出力
npx cap sync             # dist/ → iOS/Android に同期
npx cap open ios         # Xcode で開く
npx cap open android     # Android Studio で開く
```

**注意**: コードを変更したら必ず `npm run build && npx cap sync` をしてからネイティブ確認。

## API 通信

BFF (`/web`) の API を呼び出す。すべて `lib/services/` 経由で行う。

```typescript
// ✅ サービス経由
import { readingService } from "@/lib/services/reading";
const result = await readingService.create(params);

// ❌ fetch を直接書かない
const res = await fetch("/api/readings/personal", { ... });
```

JWT は `Authorization: Bearer <token>` ヘッダーで送信。

## SSE ストリーミング (useChat)

```typescript
// AI リーディングには Vercel AI SDK の useChat を使う
import { useChat } from "@ai-sdk/react";
const { messages, append } = useChat({ api: "/api/readings/personal" });
```

SSE が動かない場合、まず `CapacitorHttp.enabled` が `false` かを確認。

## ゲストユーザーフロー

1. アプリ初回起動 → UUID 生成 → ローカルに保存
2. `POST /api/device/register` でデバイス登録 → ゲスト `Client` 作成
3. OAuth ログイン後 → デバイスと `User` を紐付け

## 状態管理 (Zustand)

```typescript
// stores/ のストアを使う
import { useAuthStore } from "@/lib/stores/auth";
const { client, token } = useAuthStore();
```

グローバル状態は必ず Zustand ストア経由。コンポーネント内で直接ローカルストレージを触らない。

## ローカル DB (SQLite)

```typescript
import { useSQLite } from "@/lib/repositories/database";
// repositories/ 経由でアクセスする
```

オフライン対応・マスターデータキャッシュに使用。直接 SQL を書かず、必ず `repositories/` 層を経由する。

## マスターデータの更新

起動時に `/api/masters/check-update` でバージョン確認し、バージョンが古ければ全データを再取得してローカルにキャッシュする。BFF 側でマスターデータを変更した場合は必ず `MasterConfig` のバージョンを更新すること（しないとモバイルに変更が反映されない）。

## 収益化

- **RevenueCat** (`@revenuecat/purchases-capacitor`): サブスクリプション (GUEST → FREE → STANDARD → PREMIUM)
- **AdMob** (`@capacitor-community/admob`): 無料ユーザー向け広告

プランの変更は BFF の `POST /api/clients/plan/change` にも通知して DB を同期する。

## iOS / Android 固有の注意点

- **iOS**: Apple Sign In 用の `AuthKey_*.p8` はプロジェクトルートに配置 (Git 管理外)
- **Android**: `android/app/` 内で AdMob アプリ ID を設定
- **権限**: カメラ・フォトライブラリ等は `Info.plist` (iOS) / `AndroidManifest.xml` (Android) に追記
