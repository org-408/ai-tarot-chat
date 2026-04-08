# Resend Release Notifications

## 目的

この仕組みは、アプリのリリース通知を希望したメールアドレスに対して、
未送信の対象者だけへ一斉メール送信するためのもの。

現時点では主に次の用途を想定している。

- iOS / Android リリース時の告知
- 事前登録者への一括案内
- 送信済み管理を DB で行い、重複送信を避ける

## 実装の所在

- 送信ロジック
  - `web/lib/server/services/notification.ts`
- 既存 API エンドポイント
  - `web/app/api/notify/send/route.ts`
- 管理画面からの実行
  - `web/app/(admin)/admin/(protected)/notifications/page.tsx`
  - `web/app/(admin)/admin/(protected)/notifications/actions.ts`
- 登録テーブル
  - `EmailSubscription` (`web/prisma/schema.prisma`)

## 現在の挙動

### 1. 登録者の取得

`EmailSubscription` テーブルから、`notifiedAt = null` のレコードを未送信対象として取得する。

`platform` により次の絞り込みを行う。

- `all`
- `ios`
- `android`
- `both`

### 2. メール本文の生成

HTML メール本文は `notification.ts` 内で組み立てている。
ダウンロード導線は次を使う。

- `AUTH_URL` があれば `${AUTH_URL}/download`
- なければ `https://ai-tarot.chat/download`

### 3. Resend による送信

`sendReleaseNotifications()` が Resend を使って 1 件ずつ送信する。

重要:

- `Resend` client はモジュールロード時には生成しない
- 実際に送信するタイミングで初期化する

これは `RESEND_API_KEY` 未設定環境でも `next build` が落ちないようにするため。

### 4. 送信済み管理

送信成功した対象者には `notifiedAt` を保存する。

そのため、同じ対象者は次回以降の送信対象から除外される。

失敗したメールアドレスは `errors` として収集し、処理自体は継続する。

## 認証モデル

現状は送信経路が 2 つある。

### 管理画面

管理画面は Auth.js の `ADMIN` セッションで実行する。
Server Actions 経由で `notificationService` を直接呼び出す。

### 既存 API

`/api/notify/send` は後方互換のため残している。
こちらは `ADMIN_API_SECRET` を Bearer token として要求する。

## 必要な環境変数

- `RESEND_API_KEY`
- `NOTIFY_FROM_EMAIL` 任意
- `AUTH_URL` 任意
- `ADMIN_API_SECRET`
  - `/api/notify/send` を使う場合に必要

## 今後やるべきこと

### 優先度: 高

1. 管理画面を正規の運用経路に寄せる

現在は管理画面の Server Actions が主経路になっている。
今後は `/api/notify/send` を運用上どう扱うかを決める必要がある。

候補:

- 完全に管理画面専用に寄せる
- 外部運用用途があるなら API を残す

2. メール本文のテンプレート分離

今は `notification.ts` の文字列テンプレートで直接 HTML を持っている。
文面変更や差し替えを考えると、将来的にはテンプレート化した方が保守しやすい。

3. 送信ログの永続化

今は失敗内容をレスポンスで返すだけ。
本番運用では次を残した方がよい。

- 実行日時
- 実行者
- 対象件数
- 成功件数
- 失敗件数
- 失敗理由

### 優先度: 中

4. 配信停止 / unsubscribe 設計

現状のスキーマは「通知登録」と「送信済み管理」が中心。
メール運用としては unsubscribe の扱いを明示した方がよい。

例:

- `unsubscribedAt`
- `status`
- unsubscribe token

5. 再送戦略の明確化

いまは失敗分だけ `notifiedAt` が更新されず、結果的に再送可能になる。
これはシンプルだが、次を整理しておくとよい。

- 一部失敗時の再実行手順
- 同一宛先への短時間再送制御
- 失敗回数の上限

6. 本文のバリエーション管理

今後、iOS / Android だけでなく次のような通知を送る可能性がある。

- 新機能案内
- メンテナンス告知
- 事前登録キャンペーン終了案内

その場合は「通知種別」とテンプレートを分ける必要がある。

## 注意点

- `RESEND_API_KEY` が未設定でも build は通るようにしているが、送信実行時には当然失敗する
- 送信元メールアドレスは Resend 側で検証済みドメインに合わせる必要がある
- 本文内リンクは `AUTH_URL` に依存するため、環境ごとの値に注意する
- 既存 API と管理画面 action の二重経路があるため、運用ルールを明文化した方がよい

## 推奨運用

当面は次の方針が安全。

- 管理者は管理画面から送信する
- API の直接利用は保守・緊急用に限定する
- 本番送信前に staging または dry-run 相当の確認手順を持つ
- 送信履歴を将来的に DB 保存する
