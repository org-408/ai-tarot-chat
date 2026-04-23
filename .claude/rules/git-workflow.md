# Git ワークフロールール

## ベースブランチ

- PR 作成・プッシュは常に **`staging`** をベースとする
- `main` は本番リリース専用。直接 PR を出したり push したりしない
- `gh pr create` は **必ず `--base staging`** を付ける。ユーザーから都度指示されなくてもデフォルトで staging に向ける。確認不要・省略不可
- 「PR 作って」「PR 出して」等の指示はすべて `staging` への PR 作成と解釈する。main を指定されたら明示的に確認する

## PR を作成する前に

- `gh pr list` または `gh pr view` で既存 PR の状態（open / merged / closed）を必ず確認する
- マージ済み・クローズ済みのブランチに追加プッシュしない

## 既存 PR への追加修正は禁止（重要）

**直前に作ったばかりの PR であっても、修正を加える前に必ず `gh pr view <番号> --json state,mergedAt` で状態を確認する。**

理由: このプロジェクトはサーバーをローカルで起動して検証できない構成のため、ユーザーは PR をマージ・デプロイしてからでないと修正内容を検証できない。つまり **ユーザーが検証フィードバックを返した時点で元の PR はすでに MERGED/CLOSED になっている** のが常態。

```
❌ 「さっき作った PR #212 に追加コミット push」→ 既にマージ済みで意味なし
✅ 「PR #212 は MERGED → 新しいブランチを origin/staging から切って新 PR」
```

### 修正時の手順（徹底）

1. **まず既存 PR の状態を確認**
   ```bash
   gh pr view <直前のPR番号> --json state,mergedAt
   ```
2. state が `OPEN` → 同ブランチに追加コミット可
3. state が `MERGED` / `CLOSED` → **必ず新しいブランチを `origin/staging` から切って新 PR を作る**

この確認を飛ばして「同じブランチに push しよう」と発言・実行することは禁止。ユーザーから「新 PR 作って」と明示された場合はもちろん、明示されていなくても、状態確認なしに既存ブランチへ戻らないこと。

## 修正をプッシュする流れ

1. `git fetch origin staging` で最新の staging を取得
2. 必要なら `git rebase origin/staging` で追従
3. `git push origin HEAD:staging`（直接修正の場合）または PR ブランチへプッシュ（PR が open の場合のみ）

## staging への直接プッシュ

PR のレビューサイクルを挟まず即適用したい小修正は `staging` へ直接プッシュしてよい。
ただし rebase で staging の最新に追従してからプッシュすること。

## push 前の必須チェック

コミット・プッシュの前に必ず以下を **作業ディレクトリ内で** 実行し、エラーがないことを確認する。

```bash
# Web を変更した場合
cd web
npx tsc --noEmit   # 型エラーがないこと
npm run build      # ビルドが通ること（余裕がある場合）
```

- CI で初めてエラーを検知するのは NG。手元で事前に潰す
- worktree で作業している場合は worktree 内で実行する（メインリポジトリの node_modules では不十分）
- Mobile / Tauri を変更した場合も同様に対象ディレクトリで型チェックを行う
