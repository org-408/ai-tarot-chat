# Git ワークフロールール

## ベースブランチ

- PR 作成・プッシュは常に **`staging`** をベースとする
- `main` は本番リリース専用。直接 PR を出したり push したりしない

## PR を作成する前に

- `gh pr list` または `gh pr view` で既存 PR の状態（open / merged / closed）を必ず確認する
- マージ済み・クローズ済みのブランチに追加プッシュしない

## 修正をプッシュする流れ

1. `git fetch origin staging` で最新の staging を取得
2. 必要なら `git rebase origin/staging` で追従
3. `git push origin HEAD:staging`（直接修正の場合）または PR ブランチへプッシュ（PR が open の場合のみ）

## staging への直接プッシュ

PR のレビューサイクルを挟まず即適用したい小修正は `staging` へ直接プッシュしてよい。
ただし rebase で staging の最新に追従してからプッシュすること。
