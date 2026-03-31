# Mobile (Capacitor) - Claude Code ガイド

## 概要

`/mobile` は Capacitor 8 + React + Vite 製のモバイルアプリ (iOS / Android)。BFF (`/web`) の API を呼び出す。

## 開発コマンド

```bash
npm run dev            # Web ブラウザで開発 (http://localhost:5173)
npm run build          # ビルド (dist/ に出力)

# Capacitor 同期・実行
npx cap sync           # dist/ をネイティブプロジェクトに同期
npx cap sync ios       # iOS のみ同期
npx cap sync android   # Android のみ同期
npx cap open ios       # Xcode で開く
npx cap open android   # Android Studio で開く
npx cap run ios        # iOS シミュレーターで実行
npx cap run android    # Android エミュレーターで実行
```

## アプリ情報

- **アプリ ID**: `com.atelierflowlab.aitarotchat`
- **アプリ名**: AI Tarot Chat
- **Web ディレクトリ**: `dist/`

## ディレクトリ構成

```
mobile/src/
├── app.tsx              # ルートコンポーネント・ルーティング
├── main.tsx             # エントリーポイント
├── splashscreen.tsx     # スプラッシュスクリーン
├── components/          # UI コンポーネント
├── lib/
│   ├── services/        # API 呼び出し・ビジネスロジック
│   ├── repositories/    # ローカル DB (SQLite) アクセス
│   ├── stores/          # Zustand グローバルステート
│   ├── hooks/           # カスタムフック
│   ├── plugins/         # Capacitor プラグインラッパー
│   ├── utils/           # ユーティリティ関数
│   └── logger/          # ロガー (クライアントサイド)
└── types/               # TypeScript 型定義
```

## 重要な制約・既知の問題

### SSE ストリーミングと CapacitorHttp

```typescript
// capacitor.config.ts
plugins: {
  CapacitorHttp: {
    enabled: false,  // ← 必ず false のまま維持
  }
}
```

`enabled: true` にすると `window.fetch()` がネイティブ HTTP に差し替えられ、AI リーディングの SSE ストリーミング (`useChat`) が `React error #185` で中断される。HTTP 認証ヘッダーは `lib/plugins/http.ts` で `window.fetch()` を直接呼び出して対応。

### キーボード設定

```typescript
Keyboard: {
  resize: "none",
  resizeOnFullScreen: true,
}
```

チャット入力時のレイアウト崩れを防ぐため `resize: "none"` を設定。

## 状態管理 (Zustand)

`lib/stores/` 配下のストアでグローバルステートを管理。主なストア:

- **認証ストア**: JWT トークン、クライアント情報、ログイン状態
- **マスターデータストア**: スプレッド・カード・Tarotist などのキャッシュ
- **リーディングストア**: 現在のリーディング状態

## ローカルストレージ (SQLite)

`lib/repositories/` で `@capacitor-community/sqlite` を使用。オフライン対応やキャッシュに使用。

## 収益化

- **RevenueCat** (`@revenuecat/purchases-capacitor`): サブスクリプション管理
  - プラン: GUEST → FREE → STANDARD → PREMIUM
- **AdMob** (`@capacitor-community/admob`): 無料ユーザー向け広告

## API 通信

- BFF (`/web`) への通信: `lib/services/` 経由
- JWT トークンを `Authorization: Bearer <token>` ヘッダーで送信
- SSE ストリーミング: `useChat` フック (Vercel AI SDK `@ai-sdk/react`)

## ゲストユーザーフロー

1. アプリ初回起動時に UUID を生成してデバイス ID として保存
2. `POST /api/device/register` でデバイス登録 → ゲスト用 `Client` 作成
3. OAuth ログイン後にデバイスとアカウントを紐付け

## マスターデータの更新チェック

起動時に `GET /api/masters/check-update` でバージョン確認 → 古ければ全データ再取得してローカルにキャッシュ。

## iOS / Android 固有設定

### iOS

- `ios/App/` 内の `Info.plist` でカメラ・フォトライブラリ権限を設定
- Apple Sign In 用の `AuthKey_*.p8` がルートに配置 (Git 管理対象外)

### Android

- `android/app/` 内で AdMob のアプリ ID 設定

## 型定義

`shared/lib/types.ts` の型を import して使用。モバイル固有の型は `mobile/src/types/` に定義。
