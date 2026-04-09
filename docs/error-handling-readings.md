# 占い API エラーハンドリング仕様

対象: クイック占い (`/api/readings/simple`) / パーソナル占い (`/api/readings/personal`)

---

## Web 側（BFF API）

### エラーレスポンス形式

すべてのエラーは `ReadingErrorResponse` 型で統一して返す。

```typescript
{ code, message, retryable, phase, details? }
```

`createReadingErrorResponse()` (`web/lib/server/utils/reading-error.ts`) を必ず使うこと。`Response.json()` / `NextResponse.json()` を直接使わない。

### エラーコード一覧

| コード | HTTP | retryable | 主な発生箇所 |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | false | JWT 無効・期限切れ |
| `LIMIT_REACHED` | 429 | false | 1日の利用上限超過 |
| `QUESTION_TOO_SHORT` | 400 | false | 質問 5 文字未満 |
| `QUESTION_TOO_LONG` | 400 | false | 質問 200 文字超 |
| `MODERATION_BLOCKED` | 400 | false | NGワード検出 |
| `PROVIDER_TEMPORARY_FAILURE` | 503 | true | AI プロバイダ一時障害 |
| `NETWORK_OR_STREAM_FAILURE` | 502 | true | SSE ストリーム切断 |
| `INTERNAL_ERROR` | 500 | true | 予期しない例外全般 |

`retryable` は `retryableByCode` マップで一元管理されており、コード別にデフォルト値が決まる。

### ログ方針

- `console.log` / `console.error` は使わない（`web-api.md` ルール）
- Winston `logWithContext` を使う
- リクエストボディのログには機微情報（質問文本文）を含めない

---

## Mobile 側（`mobile/src/components/chat-panel.tsx`）

### エラーの流れ

```
fetch() 例外（ネットワーク断・タイムアウト）
    ↓
transportFetch の try-catch で捕捉
ReadingChatError{ code: "NETWORK_OR_STREAM_FAILURE", retryable: true } に変換
    ↓
useChat の onError コールバック
    ↓
isReadingChatError() で判定 → resolvedError にセット
    ↓
setChatError(resolvedError)
    ↓
チャット内インライン赤ボックスで表示
```

### 401 自動リカバリ

通常の API コール（`Http.executeRequest`）は 401 時に自動でトークンリフレッシュを行うが、`useChat` の `transportFetch` はこのロジックを持たないため、個別に実装している。

```
transportFetch で 401 受信
    ↓
useAuthStore.getState().refresh() でトークン再取得
    ↓
新トークンで同じリクエストをリトライ
    ↓
成功: ユーザーはエラーを見ない（占いが継続される）
失敗: UNAUTHORIZED として onError へ
```

### エラー表示: チャット内インライン赤ボックス

チャットメッセージ一覧の末尾に表示。送信操作でクリアされる。

```
┌──────────────────────────────────┐
│ [ヘッダー]                        │  ← 太字
│ メッセージ本文                     │
│                                  │
│ [もう一度試す]  [戻る]             │  ← retryable / isInputFixableError で制御
└──────────────────────────────────┘
```

- `retryable: true` → 「もう一度試す」ボタンを表示（`regenerate()` を呼ぶ）
- `inputErrorCodes`（QUESTION_TOO_SHORT / QUESTION_TOO_LONG / MODERATION_BLOCKED）→ 戻るボタンなし、入力欄に質問を復元
- それ以外 → 「戻る」ボタンのみ

### エラーコード別の表示内容

| エラーコード | ヘッダー | メッセージ | ボタン |
|---|---|---|---|
| `UNAUTHORIZED`（自動回復失敗時） | 占いを続けられませんでした | サーバーから返る message | 戻る |
| `LIMIT_REACHED` | 占いを続けられませんでした | サーバーから返る message（クイック/パーソナルで文言自動切替） | 戻る |
| `QUESTION_TOO_SHORT` | 入力内容を確認してください | サーバーから返る message | なし（入力欄に質問復元） |
| `QUESTION_TOO_LONG` | 入力内容を確認してください | サーバーから返る message | なし（入力欄に質問復元） |
| `MODERATION_BLOCKED` | 入力内容を確認してください | サーバーから返る message | なし（入力欄に質問復元） |
| `PROVIDER_TEMPORARY_FAILURE` | 占いを続けられませんでした | サーバーから返る message | もう一度試す / 戻る |
| `NETWORK_OR_STREAM_FAILURE` | 占いを続けられませんでした | 通信に失敗しました。電波の良い場所で再度お試しください。 | もう一度試す / 戻る |
| `INTERNAL_ERROR` | 占いを続けられませんでした | サーバーから返る message | もう一度試す / 戻る |

### エラー表示: 保存失敗トースト

占い結果の保存（`/api/clients/readings`）に失敗した場合、チャット下部に 4 秒間表示してフェードアウト。チャットの流れを邪魔しないよう赤ボックスとは別に表示する。

```
⚠️ 占い結果の保存に失敗しました。通信環境をご確認ください。
   ↑ bottom:24 に absolute 表示、4秒後に自動消滅（AnimatePresence でアニメーション）
```

`withSavingIndicator: true`（ユーザー操作に伴う前景保存）のときのみ通知する。バックグラウンド遷移時・アンマウント時（`withSavingIndicator: false`）は通知しない。

---

## モデレーション（NGワード）の処理フロー

```
ユーザーが質問送信
    ↓
BFF: NgWordService でチェック
    ↓
NGワード検出
    ↓
createReadingErrorResponse({
  code: "MODERATION_BLOCKED",
  status: 400,
  retryable: false,
  message: moderation.message ?? "申し訳ございません。その内容は占うことができません。",
})
    ↓
Mobile: transportFetch で !response.ok → ReadingChatError に変換
    ↓
onError: inputErrorCodes に MODERATION_BLOCKED が含まれるため分岐
    ↓
送信した質問をチャット履歴から削除 + 入力欄に文章を復元
setChatError(resolvedError)
    ↓
ヘッダー「入力内容を確認してください」
メッセージ: サーバーから返ったモデレーション理由文
ボタン: なし（入力欄に質問が復元されているので修正して再送できる）
```

ユーザーは内容を修正してそのまま再送できる状態になる。「戻る」ボタンは表示されない。

---

## 関連ファイル

| ファイル | 役割 |
|---|---|
| `web/lib/server/utils/reading-error.ts` | `ReadingRouteError` / `createReadingErrorResponse` / `retryableByCode` |
| `web/app/api/readings/simple/route.ts` | クイック占い API |
| `web/app/api/readings/personal/route.ts` | パーソナル占い API |
| `web/lib/server/validators/ng-words.ts` | NGワードチェック |
| `shared/lib/types.ts` | `ReadingErrorCode` / `ReadingErrorResponse` 型定義 |
| `mobile/src/components/chat-panel.tsx` | useChat + transportFetch + エラー UI |
| `mobile/src/lib/utils/reading-chat-error.ts` | `ReadingChatError` / `createReadingChatErrorFromResponse` |
| `mobile/src/lib/stores/auth.ts` | `useAuthStore` (トークンリフレッシュ) |
