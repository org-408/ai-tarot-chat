# CI/CD 構築仕様書 & 進捗管理

> このファイルは Claude Code が参照しながら実装を進めるための仕様書です。
> ステータスを更新しながら進めてください。

---

## 概要

| 項目 | 内容 |
|---|---|
| 対象リポジトリ | ai-tarot-chat |
| CI プラットフォーム | GitHub Actions |
| Web デプロイ先 | Render |
| DB | Neon (PostgreSQL) |
| 作業ブランチ | `claude/sleepy-volhard` → PR → `main` |

---

## ブランチ・環境戦略

```
feature/* → PR → staging → PR → main

local    : Docker PostgreSQL
staging  : Render (staging service) + Neon (staging branch)
production: Render (production service) + Neon (main branch)
```

---

## 実装タスク一覧

### Phase 1: GitHub Actions ワークフロー

| # | タスク | ファイル | ステータス |
|---|---|---|---|
| 1-1 | Web lint + tsc | `.github/workflows/ci.yml` | ✅ 完了 |
| 1-2 | Web next build | `.github/workflows/ci.yml` | ✅ 完了 |
| 1-3 | Mobile lint + tsc + vite build | `.github/workflows/ci.yml` | ✅ 完了 |
| 1-4 | Prisma migrate diff チェック | `.github/workflows/ci.yml` | ✅ 完了 |
| 1-5 | deploy-staging.yml 作成 | `.github/workflows/deploy-staging.yml` | ✅ 完了 |
| 1-6 | deploy-production.yml 作成 | `.github/workflows/deploy-production.yml` | ✅ 完了 |
| 1-7 | ワークフローファイルをコミット & push | — | 🔲 未着手 |
| 1-8 | main への PR 作成 | — | 🔲 未着手 |

### Phase 2: GitHub Secrets 登録

| # | タスク | ステータス | 備考 |
|---|---|---|---|
| 2-1 | `RENDER_DEPLOY_HOOK_STAGING` 登録 | 🔲 未着手 | Render staging サービス作成後 |
| 2-2 | `RENDER_DEPLOY_HOOK_PRODUCTION` 登録 | 🔲 未着手 | Render の Deploy Hook URL |

### Phase 3: Neon staging 環境構築（手動）

| # | タスク | ステータス | 備考 |
|---|---|---|---|
| 3-1 | Neon で `staging` ブランチ作成 | 🔲 未着手 | main から分岐、接続 URL を控える |

### Phase 4: Render staging 環境構築（手動）

| # | タスク | ステータス | 備考 |
|---|---|---|---|
| 4-1 | Render staging Web Service 作成 | 🔲 未着手 | Branch: `staging` |
| 4-2 | Render staging 環境変数設定 | 🔲 未着手 | `DATABASE_URL` = Neon staging URL |
| 4-3 | Render staging Pre-deploy Command 設定 | 🔲 未着手 | `cd web && npx prisma migrate deploy` |
| 4-4 | Render production Pre-deploy Command 追加 | 🔲 未着手 | 既存サービスに追加 |
| 4-5 | Render staging Deploy Hook URL を控える | 🔲 未着手 | → Phase 2-1 に使用 |

### Phase 5: staging ブランチ作成

| # | タスク | ステータス | 備考 |
|---|---|---|---|
| 5-1 | `staging` ブランチ作成 & push | 🔲 未着手 | `git checkout -b staging && git push -u origin staging` |

---

## ワークフロー仕様

### ci.yml

**トリガー:** `main` / `staging` への PR・push

**Web ジョブ:**
1. `npm ci`
2. `npx prisma generate`（DATABASE_URL はダミー値を CI 環境変数に設定）
3. `npm run lint`
4. `npx tsc --noEmit`
5. `npm run build`
6. `prisma migrate diff --exit-code`（migrations ディレクトリが存在する場合のみ）

**Mobile ジョブ:**
1. `npm ci`
2. `npm run lint`
3. `npx tsc -b`
4. `npm run build`

### deploy-staging.yml

**トリガー:** `staging` ブランチへの push
**内容:** `RENDER_DEPLOY_HOOK_STAGING` を curl で叩くだけ
**migration:** Render の Pre-deploy Command が担う

### deploy-production.yml

**トリガー:** `main` ブランチへの push
**内容:** `RENDER_DEPLOY_HOOK_PRODUCTION` を curl で叩くだけ
**migration:** Render の Pre-deploy Command が担う

---

## Render 設定値（全環境共通）

```
Build Command:      cd web && npm ci && npx prisma generate && npm run build
Pre-deploy Command: cd web && npx prisma migrate deploy
Start Command:      cd web && npm start
```

---

## Prisma マイグレーション運用ルール

| 環境 | コマンド | タイミング |
|---|---|---|
| ローカル | `prisma migrate dev` | schema.prisma 変更時 |
| CI | `prisma migrate diff --exit-code` | PR 時に自動チェック |
| staging / production | `prisma migrate deploy` | Render Pre-deploy で自動実行 |

**注意:** `prisma migrate dev` は本番・ステージングでは絶対に使わない。

---

## 次のアクション（Claude が次に実施すること）

1. ワークフローファイルをコミット & push（Phase 1-7）
2. main への PR 作成（Phase 1-8）
3. GitHub Secrets 登録（Phase 2）
4. staging ブランチ作成（Phase 5）
5. Neon・Render の手動手順を案内（Phase 3・4）
