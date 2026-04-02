# AI Tarot Chat Analytics Measurement Plan

## Goal

このプロダクトは現時点ではモバイルアプリ主体で、Web のマーケティングページは主に集客と認証導線の役割を持つ。
一方で、将来的に Web サービス自体が主力チャネルになる可能性もある。

そのため、分析基盤は次の条件を満たす必要がある。

- 今すぐ LP 群の改善に使える
- 将来 iOS / Android / Web を同じ軸で比較できる
- 初期コストを抑えつつ、後から広告計測や deep link 計測を拡張できる

結論として、一次基盤は `GA4` を採用し、アプリ公開後は `Firebase Analytics` を同じ GA4 property に接続する。
広告運用や web-to-app attribution が本格化した段階で、必要に応じて `AppsFlyer` または `Adjust` を追加する。

## Product Positioning

分析設計上の位置付けは次の通り。

- Web LP は「集客面」
- Web 認証は「導線面」
- モバイルアプリは「主たる利用面」
- 将来の Web サービスは「別チャネルの利用面」

この前提では、LP の評価をページビュー中心で見るのではなく、以下の価値到達で見る。

- 認証開始
- 認証完了
- 初回リーディング開始
- 継続利用
- 有料プラン到達

## Recommended Stack

### Phase 1

- `GA4` を唯一の一次分析基盤として導入
- Web LP 群と認証ページからイベント送信
- UTM と referrer を保持

### Phase 2

- モバイルアプリに `Firebase Analytics` を導入
- 同一のイベント名で app 側も計測
- `first_open` と `first_reading_started` を取得

### Phase 3

- 広告出稿や web-to-app 最適化が本格化したら `AppsFlyer` または `Adjust` を追加
- deferred deep link、store attribution、広告媒体別 ROAS を整備

## KPI Tree

最重要 KPI は、単なる流入量ではなく「価値到達率」を置く。

### North Star

- `first_reading_started_users`

理由:
このプロダクトにおける最初の本質価値は、ユーザーが実際に占いを開始した瞬間だから。

### Primary KPIs

- `lp_to_signin_rate`
- `signin_to_auth_complete_rate`
- `auth_complete_to_first_reading_rate`
- `paid_plan_start_rate`

### Secondary KPIs

- `landing_cta_ctr`
- `pricing_to_download_rate`
- `download_to_signin_rate`
- `return_7d_rate`
- `plan_view_to_paid_start_rate`

### Guardrail Metrics

- LP 離脱率
- 認証失敗率
- 初回リーディング失敗率
- 有料導線離脱率

## Funnel Definitions

### Funnel A: LP Improvement Funnel

`landing_view`
-> `cta_click`
-> `signin_view`
-> `auth_complete`

目的:
マーケティングページの導線改善。

### Funnel B: Activation Funnel

`auth_complete`
-> `onboarding_started`
-> `reading_started`
-> `reading_completed`

目的:
獲得したユーザーが本当に価値到達しているかを見る。

### Funnel C: Monetization Funnel

`pricing_view`
-> `plan_cta_click`
-> `checkout_started`
-> `subscription_started`

目的:
無料利用から課金への転換効率を見る。

## Scope for Phase 1

まずは次の Web 範囲だけで始める。

- `/`
- `/pricing`
- `/download`
- `/auth/signin`

現行コード上の対応先:

- `web/app/(marketing)/page.tsx`
- `web/app/(marketing)/pricing/page.tsx`
- `web/app/(marketing)/download/page.tsx`
- `web/app/auth/signin/page.tsx`

## Event Design Principles

### Rule 1

イベント名はチャネル依存ではなく行動依存にする。

良い例:

- `signin_view`
- `auth_complete`
- `reading_started`

避けたい例:

- `web_landing_button_click`
- `ios_signup_finish`

チャネル差分は event property で吸収する。

### Rule 2

最初は少数精鋭にする。

イベントが多すぎると運用不能になるため、最初は 10 個前後で開始する。

### Rule 3

すべての CTA に意味ラベルを付ける。

単に click を取るのではなく、どのページのどの位置のどの意図の CTA かを識別できるようにする。

## Phase 1 Event Catalog

### 1. `page_view`

送信タイミング:
対象ページ表示時

必須プロパティ:

- `page_name`
- `page_category`
- `channel`
- `platform_intent`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `referrer`

想定値:

- `page_name`: `landing`, `pricing`, `download`, `signin`
- `page_category`: `marketing`, `auth`
- `channel`: `web`
- `platform_intent`: `web`, `app`, `unknown`

### 2. `cta_click`

送信タイミング:
LP や認証導線上の CTA 押下時

必須プロパティ:

- `page_name`
- `placement`
- `cta_name`
- `target_path`
- `target_type`
- `platform_intent`
- `plan_code`

例:

- Hero の「アプリをダウンロード」
- Header の「今すぐ始める」
- Pricing の各プラン CTA
- Download の「Webで今すぐ始める」

### 3. `section_view`

送信タイミング:
主要セクションが viewport に入ったとき

必須プロパティ:

- `page_name`
- `section_name`

最初に対象にするセクション:

- landing hero
- features
- tarotists
- plan_highlights
- final_cta

補足:
これは後回しでもよいが、LP 最適化には役に立つ。

### 4. `signin_view`

送信タイミング:
`/auth/signin` 表示時

必須プロパティ:

- `entry_point`
- `is_mobile_app`
- `callback_url_present`

備考:
`isMobile=true` があるため、モバイルアプリ認証との分離が可能。

### 5. `auth_start`

送信タイミング:
Google / Apple などの認証開始時

必須プロパティ:

- `provider`
- `entry_point`
- `is_mobile_app`

### 6. `auth_complete`

送信タイミング:
認証成功時

必須プロパティ:

- `provider`
- `entry_point`
- `is_mobile_app`
- `user_status`

想定値:

- `user_status`: `new`, `returning`, `unknown`

### 7. `reading_started`

送信タイミング:
ユーザーが最初の占い開始操作を行った時

必須プロパティ:

- `channel`
- `plan_code`
- `tarotist_name`
- `spread_code`
- `reading_type`

備考:
これは Web LP だけではなく、アプリ側も含めて最重要イベント。

### 8. `reading_completed`

送信タイミング:
占い結果が正常に出た時

必須プロパティ:

- `channel`
- `plan_code`
- `tarotist_name`
- `spread_code`
- `reading_type`

### 9. `plan_view`

送信タイミング:
課金やプラン比較 UI の表示時

必須プロパティ:

- `page_name`
- `plan_code`
- `placement`

### 10. `subscription_started`

送信タイミング:
有料プラン開始時

必須プロパティ:

- `channel`
- `plan_code`
- `price`
- `currency`

## Standard Properties

イベント共通でなるべく揃える property。

- `channel`
  - `web_marketing`
  - `web_app`
  - `ios_app`
  - `android_app`

- `platform_intent`
  - `app`
  - `web`
  - `unknown`

- `entry_point`
  - `landing`
  - `pricing`
  - `download`
  - `direct`
  - `mobile_app`

- `placement`
  - `header`
  - `hero`
  - `section`
  - `plan_card`
  - `footer`
  - `final_cta`

- `plan_code`
  - `GUEST`
  - `FREE`
  - `STANDARD`
  - `PREMIUM`
  - `unknown`

## Conversion Definitions in GA4

GA4 側では次を key event にする。

- `auth_complete`
- `reading_started`
- `subscription_started`

初期段階では `cta_click` は key event にせず、補助指標として扱う。
そうしないと conversion が膨らみすぎて見づらくなる。

## UTM Policy

外部流入の比較ができるよう、最低限以下を統一する。

- `utm_source`
- `utm_medium`
- `utm_campaign`

推奨:

- `utm_content`
- `utm_term`

例:

- `utm_source=x`
- `utm_medium=social`
- `utm_campaign=launch_2026q2`
- `utm_content=hero_post`

## Dashboards to Build First

### Dashboard 1: Executive

- Users
- `auth_complete`
- `reading_started`
- `subscription_started`
- channel 別比較

### Dashboard 2: LP Optimization

- page 別流入
- `cta_click` CTR
- `signin_view` 到達率
- UTM 別比較

### Dashboard 3: Activation

- `auth_complete` -> `reading_started` 率
- plan 別初回起動率
- tarotist / spread 別利用率

## Recommended Implementation Order

### Step 1

GA4 property を 1 つ作成する。

### Step 2

Web data stream を作成し、`web` アプリに導入する。

### Step 3

次の最小イベントだけ先に送る。

- `page_view`
- `cta_click`
- `signin_view`
- `auth_start`
- `auth_complete`

### Step 4

GA4 上で key event を設定する。

### Step 5

アプリ側に Firebase Analytics を導入し、次を送る。

- `first_open`
- `auth_complete`
- `reading_started`
- `reading_completed`
- `subscription_started`

### Step 6

広告予算を入れるタイミングで MMP を追加検討する。

## What Not to Do

- 最初から PostHog、GA4、AppsFlyer を全部同時導入しない
- イベント名にチャネル名を埋め込まない
- LP の page view だけで意思決定しない
- `install` を北極星指標にしない

## Suggested Next Implementation Task

次に着手する実装タスクはこれ。

1. `web` に GA4 のベース実装を入れる
2. `app/(marketing)` 配下の CTA を `cta_click` 送信対応する
3. `/auth/signin` に `signin_view` を入れる
4. `SignInForm` の認証開始・成功で `auth_start` と `auth_complete` を送る

この 4 点まで入ると、LP 改善に必要な最小限の可視化が始められる。
