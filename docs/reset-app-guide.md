# リセット機能ガイド

## 概要

アプリのリセット機能は、開発・デバッグ時に特定のデータをクリアするために使用します。

## リセットの種類

### 1. 完全リセット (`resetApp`)

**削除されるデータ:**

- ✅ 認証情報（トークン、デバイス ID、クライアント ID、ユーザー ID）
- ✅ Zustand ストア（auth, lifecycle）
- ✅ React Query キャッシュ（全て）
- ✅ マスターデータのファイルシステムキャッシュ
- ✅ Capacitor Preferences（全体）
- ✅ API クライアントのトークンキャッシュ

**用途:**

- アプリを初回起動状態に戻したい
- 認証エラーが解消しない
- データの整合性が崩れた

**実行後:**

- アプリが再起動される
- 新規デバイスとして登録される

---

### 2. マスターデータのみリセット (`resetMaster`)

**削除されるデータ:**

- ✅ マスターデータのファイルシステムキャッシュ (`master_data`)
- ✅ マスターデータバージョン情報 (`master_data_version`)
- ✅ React Query のマスターデータキャッシュ

**保持されるデータ:**

- ✅ 認証情報（そのまま）
- ✅ 利用状況（そのまま）

**用途:**

- マスターデータの更新を強制的に取得したい
- カード・スプレッドデータに問題がある
- バージョン管理のテスト

**実行後:**

- アプリが再起動される
- マスターデータがサーバーから再取得される

---

### 3. Usage のみリセット (`resetUsage`)

**削除されるデータ:**

- ✅ React Query の Usage キャッシュ
- ✅ 利用状況の最終取得日 (`usage_last_fetched_date`)

**保持されるデータ:**

- ✅ 認証情報（そのまま）
- ✅ マスターデータ（そのまま）

**用途:**

- 利用状況の再同期
- 占い回数のテスト
- Usage 関連のバグ調査

**実行後:**

- アプリが再起動される
- 利用状況がサーバーから再取得される

---

## 使用方法

### コンポーネントから使用

```typescript
import { useResetApp } from "./lib/hooks/useResetApp";

function MyComponent() {
  const { resetApp, resetMaster, resetUsage, isResetting, error } =
    useResetApp();

  const handleFullReset = async () => {
    const success = await resetApp();
    if (success) {
      window.location.reload();
    }
  };

  return (
    <button onClick={handleFullReset} disabled={isResetting}>
      {isResetting ? "処理中..." : "完全リセット"}
    </button>
  );
}
```

### 直接関数を呼ぶ

```typescript
import {
  resetAppData,
  resetMasterDataOnly,
  resetUsageOnly,
} from "./lib/utils/resetApp";

// 完全リセット
await resetAppData();

// マスターデータのみ
await resetMasterDataOnly();

// Usageのみ
await resetUsageOnly();
```

---

## デバッグ UI での使用

設定画面に `<DebugResetButton />` を配置すると、リセットメニューが表示されます：

```tsx
import { DebugResetButton } from "./components/DebugResetButton";

<DebugResetButton />;
```

メニューから以下を選択可能：

- 🚨 完全リセット
- 📦 マスターデータのみ
- 📊 利用状況のみ

---

## 注意事項

### ⚠️ 完全リセット

- **本番環境では慎重に使用すること**
- ユーザーのログイン状態が失われる
- 実行前に必ず確認ダイアログを表示

### ⚠️ 部分リセット

- マスターデータと Usage は独立している
- 片方だけリセットしても問題ない
- 認証情報は保持されるので、再ログイン不要

### ⚠️ 本番環境での使用

- DebugResetButton は開発環境でのみ表示すること
- プロダクションビルドでは無効化を推奨

```typescript
// App.tsx
{
  import.meta.env.DEV && <DebugResetButton />;
}
```

---

## トラブルシューティング

### リセット後にエラーが発生する

**原因:** キャッシュが完全にクリアされていない

**対処:**

1. アプリを完全に終了
2. 完全リセットを実行
3. アプリを再起動

### マスターデータが更新されない

**原因:** サーバー側のバージョン管理

**対処:**

1. マスターデータのみリセット
2. サーバーログで新しいバージョンを確認
3. クライアント側で正しく取得されているか確認

### Usage が同期しない

**原因:** サーバー側の日次リセットタイミング

**対処:**

1. Usage のみリセット
2. サーバーログで `/api/clients/usage` のレスポンスを確認
3. クライアント側の clientId を確認

---

## ストレージの構造

現在のアプリが使用しているストレージ：

### Capacitor Preferences

- `accessToken` - JWT トークン
- `deviceId` - デバイス識別子
- `clientId` - クライアント ID
- `userId` - ユーザー ID
- `auth-storage` - Zustand 永続化データ
- `lifecycle-storage` - Zustand 永続化データ
- `master_data_version` - マスターデータバージョン

### Filesystem

- `master_data` - マスターデータ本体（JSON）

### React Query（メモリのみ）

- `["masters"]` - マスターデータキャッシュ
- `["usage", clientId]` - 利用状況キャッシュ

---

## 開発時のベストプラクティス

1. **機能開発時:** 完全リセットで初期状態を確認
2. **データ更新時:** 該当するデータのみリセット
3. **バグ調査時:** 段階的にリセット（Usage → Master → 完全）
4. **テスト前:** 完全リセットで環境をクリーンに

---

## ログ出力

リセット実行時は以下のログが出力されます：

```
[ResetApp] App data reset started
[ResetApp] Resetting Zustand stores
[ResetApp] Clearing React Query cache
[ResetApp] Clearing API client token cache
[ResetApp] Clearing master data filesystem cache
[ResetApp] Deleting individual storage keys
[ResetApp] Clearing all Capacitor Preferences
[ResetApp] App data reset completed successfully
```

エラー時は原因も出力されます：

```
[ResetApp] App data reset failed
  error: { ... }
```
