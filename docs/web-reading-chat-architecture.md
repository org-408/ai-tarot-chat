# Web 版 クイック／パーソナル占い アーキテクチャ

モバイルと大きく異なる Web 版リーディング画面の設計。本ドキュメントは、モバイル現行仕様との差分と、Web で採用した工夫を整理する。

---

## 1. コンセプト

- **単一画面 2 カラム**（左: チャット／セレクト、右: スプレッド）
- **単一 `useReadingChat` セッション**で Phase1→Phase2 を連続運用
- Phase1/Phase2 の画面切替・hook 再マウントを廃止

モバイルは上下 2 段 + Phase1/Phase2 別マウントという既存設計を維持。Web だけが新設計。

---

## 2. モバイルとの差分サマリ

| 観点 | モバイル（現行） | Web（新） |
|---|---|---|
| レイアウト | 上: UpperViewer／下: ChatView（折畳）| 左: ChatView／右: SpreadReveal（トグル） |
| Phase 管理 | `phase: "chat" \| "reading"` の 2 ステージ + `PersonalPhase2View` 別マウント | `stage: "select" \| "chat"` の 2 ステージのみ（内部フェーズは messages.length から導出） |
| `useChatSession` | `isPhase2` で 2 系統のラン（Phase1 と Phase2 で別インスタンス）| 単一 `useReadingChat` セッション |
| `initialMessages` の受け渡し | Phase1→Phase2 間で親が保持し注入 | 不要（連続セッション） |
| Phase2 初回メッセージ | Phase2 hook マウント時に auto-send | めくり完了 (`isRevealingCompleted=true`) で auto-send |
| カードめくり体験 (Personal) | Phase2 突入 500ms 後に自動めくり | ユーザーが 1 枚ずつ or 「一気にめくる」ボタンで能動的にめくる |
| セレクト画面 | クイックと パーソナルで別 UI | `SelectionView` に共通化（`isPersonal` フラグで分岐）|
| タロティスト選択 | モバイル専用 Embla カルーセル | 同左（`TarotistCarouselPortrait` はそのまま Web でも使用） |

---

## 3. 単一セッション化の根拠

サーバー [web/app/api/readings/personal/route.ts](../web/app/api/readings/personal/route.ts) はリクエストの `clientMessages.length` だけでフェーズを判定する。

| messages.length | サーバー挙動 | クライアント送信 |
|---|---|---|
| 1 | Phase1-1 挨拶プロンプト | `"よろしくお願いします"`（マウント時 auto） |
| 3 | Phase1-2 スプレッド提案 | ユーザー入力（占いたい内容） |
| 5 | Phase2 初回鑑定 + DB 保存 + 利用量消費 | `"{spread.name}で占ってください。"`（めくり完了で auto） |
| 7 / 9 / 11 | Phase2 中間質問 1/2/3 | ユーザー入力 |
| `>6 && isEndingEarly` | Phase2 クロージング | `handleSessionClose()` |

つまり「単一の `useChat` インスタンスで正しい順序・回数だけメッセージを流し込めば、サーバーが自動で Phase 遷移する」。Phase ごとに別 hook を立てる必要はない。

### サーバー互換性

- モバイルの `initialLen`（動的計算）→ Web の `initialLen: 4`（固定値）
- サーバーは `initialLen ?? 0` のまま。どちらも受理
- `initialLen` は Q&A ターン (`messages.length > 6`) の保存時に「Phase2 最初の AI 応答を `FINAL_READING` としてタグ付ける」用途のみ。Phase1 が固定 4 メッセージで終わるので `4` を固定で送れば単一セッションでも正しく動く

---

## 4. ファイル構成（Web 側）

```
shared/
  hooks/
    use-reading-chat.ts        ← 新規。単一セッション hook
    use-chat-session.ts        ← モバイル向けに現状維持（将来削除可）

web/
  app/(app)/
    simple/page.tsx            ← 全面リライト（2 カラム、新 hook）
    personal/page.tsx          ← 全面リライト（単一セッション、2 カラム）
  components/reading/
    two-column-reading-layout.tsx   ← 左右 2 カラム + トグル
    selection-view.tsx              ← クイック/パーソナル共通セレクト
    chat-column.tsx                 ← 左: 占い師肖像（折畳）+ ChatView
    spread-reveal-column.tsx        ← 右: UpperViewer + 一気にめくるボタン
    tarotist-carousel-portrait.tsx  ← 既存
  messages/ja.json             ← 翻訳キー追加
```

---

## 5. 単一セッション hook の挙動（`useReadingChat`）

### Stage（内部状態）

`messages.length` + 付帯条件から純関数的に導出。

```
greeting         length 0-1        初回「よろしくお願いします」送信待ち／送信中
intake           length 2-3        AI 挨拶を受けユーザー占いたい内容入力受付
spread-suggest   length 4          AI スプレッド推薦、CategorySpreadSelector を左カラム footer に表示
awaiting-draw    length 4 & spread 確定 & めくり未完    右カラムに裏面スプレッド表示中
reading          length 5-6        Phase2 初回鑑定（AI 応答中／完了）
qa               length 7-11       Q&A ターン 1〜3 問目
closing          isEndingEarly 中  クロージング応答ストリーミング中
done             クロージング完了    「もう一度占う」表示
```

### auto-send トリガー

- **マウント時**（パーソナルのみ）: `"よろしくお願いします。"`
- **めくり完了時**: `selectedSpread && drawnCards.length > 0 && isRevealingCompleted && messages.length === 4` で `"{spread.name}で占ってください。"`
- **クイック占い**: マウント時送信をスキップ。めくり完了時のみ送信（`messages.length === 0` で送信）

### transport body 定数

- パーソナル: `initialLen: 4` を固定で含める（サーバーの Q&A タグ付け用）
- クイック: なし

### その他

- JWT 401 リトライ、SSE エラーパース、moderation エラーハンドリングは [shared/hooks/use-chat-session.ts](../shared/hooks/use-chat-session.ts) のロジックを踏襲
- Phase1 スプレッド推薦パース (`length >= 4 で AI2 を正規表現で抽出`) も同様
- `handleSessionClose()` は `messages.length > 6` のときのみ有効

---

## 6. 左右 2 カラムレイアウト

### `TwoColumnReadingLayout`

- 左右 `grid-cols-2` 固定（1:1）。モバイル幅の特別扱いなし
- 右カラムの表示／非表示は常設トグルで切替。非表示時は `grid-cols-1` で左が全幅
- ヘッダー（戻るボタン・残り回数バッジ）を共通化

### 右カラム表示状態

| ステージ | 右カラム |
|---|---|
| `select` | 非表示（トグル押しても出ない）|
| Personal Phase1（`greeting` / `intake` / `spread-suggest`）| 非表示可・トグル可 |
| `awaiting-draw` | 裏面スプレッド + 「一気にめくる」ボタン |
| `reading` 以降 | 表面スプレッド |

### 「一気にめくる」ボタン

右カラム**最下部**に配置。`RevealPromptPanel` を内包せず、`SpreadRevealColumn` 内に直接ボタンとして持つ（左カラム footer に刺すのをやめる）。

---

## 7. セレクトモード共通化

| prop | クイック | パーソナル |
|---|---|---|
| `isPersonal` | `false` | `true` |
| `tarotists` | 全員 | `plan.code === "PREMIUM"` に絞る（呼び出し側でフィルタ） |
| `CategorySpreadSelector` | 表示 | 非表示 |
| 下部ボタン | CategorySpreadSelector 内の「占いを始める」| `"対話を始める"`（`SelectionView` 固有） |

---

## 8. モバイル移行の将来ロードマップ（非破壊）

1. 新 hook `shared/hooks/use-reading-chat.ts` はモバイルからも使用可能な形で設計済み
2. 将来モバイルも単一セッション化したい場合は：
   - `mobile/src/components/personal-page.tsx` の `phase: "chat" | "reading"` を撤廃
   - `mobile/src/components/chat-panel.tsx` を新 hook に書き換え
   - Phase2 突入時の自動めくり（`setTimeout 500ms`）を維持したい場合はページ側で `setIsRevealingCompleted(true)` を呼べば良い
3. 旧 `shared/hooks/use-chat-session.ts` は全プラットフォーム移行完了後に削除

本 PR ではモバイルは一切変更しない。

---

## 9. API 契約・DB スキーマ

**変更なし**。[web/app/api/readings/personal/route.ts](../web/app/api/readings/personal/route.ts)・[web/app/api/readings/simple/route.ts](../web/app/api/readings/simple/route.ts) は無変更。`initialLen` のデフォルト (`?? 0`) もそのまま。
