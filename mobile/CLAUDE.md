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

---

## Phase2 チャット保存アーキテクチャ（chat-panel.tsx）

### セッションクローズの 2 パターン

Phase2（パーソナル占い）には、クロージングシーケンスを起動する経路が 2 つある。

| 経路 | トリガー |
|---|---|
| 手動 | ユーザーが「占いを終わる」ボタンを押す |
| 自動 | 3 問使い切り後に `onFinish` が自動送信 |

**両方とも `handleSessionClose()` を経由する**（`chat-panel.tsx`）。
直接 `sendMessage` を書かず、必ずこの関数を使うこと。

```typescript
const handleSessionClose = useCallback(() => {
  isEndingEarlyRef.current = true;   // クロージング中フラグ
  sendMessage(
    { text: "ありがとうございました。今日の占いはここで終わりにします。" },
    { body: { isEndingEarly: true } },
  );
}, [sendMessage]);
```

`onFinish` 内から呼ぶ場合は `handleSessionCloseRef.current()` 経由（非同期クロージャ対応）。

### tearing 問題と shouldPersistReading ガード

AI SDK v6 の `useChat` は `messages` と `status` を別々の `useSyncExternalStore` で管理している。React event handler から `sendMessage` を呼ぶと、`messages` にクロージングユーザーメッセージが追加された瞬間に `status` がまだ `"ready"` のままというウィンドウ（tearing）が発生する。

この状態で `shouldPersistReading()` が `true` を返すと、**AI クロージング応答が含まれない保存**が走ってしまう。

これを防ぐため `shouldPersistReading` に以下のガードを入れている。

```typescript
// クロージングシーケンス中は closingAI がまだ届いていないため保存しない
if (isPhase2 && isEndingEarlyRef.current) return false;
```

`isEndingEarlyRef` は `handleSessionClose` で `true` に立てられ、`onFinish`（AI クロージング応答受信後）で `false` に戻る。

### 保存完了後のロック解除フロー

```
sendMessage(closingUserMsg)
  └─ [streaming]
  └─ status → "ready"  ← onFinish より先に発火（AI SDK v6 の挙動）
       └─ shouldPersistReading() → false（isEndingEarlyRef=true のため）
  └─ onFinish 発火
       ├─ isEndingEarlyRef = false
       ├─ isClosingCompleteRef = true   ← ref: .finally() など非同期から参照
       ├─ setIsClosingComplete(true)    ← state: 専用 effect のリアクティブトリガー
       └─ setPhase2Stage("saving")
  └─ isClosingComplete 専用 effect 発火
       └─ persistReading(true)         ← closingAI 込みで保存
            └─ .finally(): isClosingCompleteRef=true → setPhase2Stage("done")
                 └─ onUnlock() でナビゲーションロック解除
```

### phase2Stage ステートマシン

```
"chatting" → （クロージング完了）→ "saving" → （DB 保存完了）→ "done"
```

- `shouldShowBackButton` は `phase2Stage === "done"` のときのみ `true` になる
- `"saving"` 中はバウンドカーソルを表示し続ける（空白期間を防ぐ）

### 保存の重複防止（シグネチャ方式）

`buildPersistSignature()` が `readingId::inputDisabled::メッセージ列` のハッシュを生成する。`lastPersistedSignatureRef` と一致する場合は保存をスキップ。

保存中に新データが届いた場合は `pendingSaveRef = true` を立て、`.finally()` でリトライする。リトライは `withSavingIndicator=false` で実行するため `isSavingReading` インジケーターは表示されない。

### テスト観点

Phase2 の保存を変更した場合は以下 2 パターンを必ず確認する。

1. **手動クローズ**: 1〜2 問答えた後に「占いを終わる」→ closingUser ＋ closingAI 両方が DB に保存されているか
2. **オートクローズ**: 3 問使い切り → 同上

途中保存（各 Q&A 応答後）が壊れていないかも確認したい場合は「2 問後に手動クローズ」が一番効率的（途中保存 2 回 ＋ クロージング保存 1 回を一度に確認できる）。
