# SNS 戦略 TODO

最終更新: 2026-04-15

## 背景・検討経緯

X（Twitter）自動投稿機能を実装するにあたり、API / サードパーティサービスの選定を検討した。  
以下はその結果と残タスク。

---

## 現状

### 実装済み

- [x] `web/lib/server/services/twitter.ts` — `twitter-api-v2` を使った投稿クライアント
- [x] `web/lib/server/services/x-post.ts` — AI 生成 + 投稿 + DB 保存サービス
- [x] `web/lib/server/repositories/x-post.ts` — XPost / XPostConfig リポジトリ
- [x] `web/app/(admin)/admin/(protected)/x-posts/` — 管理画面（作成・履歴・自動投稿トグル）
- [x] `web/app/api/cron/x-posts/route.ts` — Cron API エンドポイント
- [x] `.github/workflows/x-post.yml` — GitHub Actions（9:00 / 12:00 / 18:00 JST）
- [x] DB スキーマ（XPost / XPostConfig）+ マイグレーション適用済み

### 未解決

- [ ] X API の 402 エラー → クレジット未購入

---

## X API Pay-Per-Use 料金

**2026年2月より Pay-Per-Use がデフォルト。Free / Basic / Pro への新規加入不可。**

| 操作 | 単価 |
|---|---|
| POST（ツイート投稿） | $0.01 / 回 |
| GET（ツイート読み取り） | $0.005 / 回 |

### コスト試算

| 頻度 | 月間ツイート数 | 月額コスト |
|---|---|---|
| 1日3回（現在の設定） | 約 90 回 | **約 $0.90** |
| 1日5回 | 約 150 回 | 約 $1.50 |

→ $5 の最小チャージで約 **5〜6ヶ月分** をカバー可能。  
→ **X Pay-Per-Use を採用する** のが最もコスト効率が高い。

---

## 他の選択肢（検討済み・棄却）

| ツール | 状況 | 棄却理由 |
|---|---|---|
| Buffer API | ❌ 新規アプリ作成終了（2025年以降） | API 利用不可 |
| Make.com X 連携 | ❌ 2025年5月以降終了 | X がアクセスを遮断 |
| Zapier | △ 利用可能 | $20/月〜 高コスト |
| n8n（セルフホスト） | △ 利用可能 | サーバー管理コスト発生 |
| **X Pay-Per-Use** | ✅ 採用 | $0.01/ツイート、安価・公式 |

---

## 残 TODO

### 🔴 優先度：高

- [ ] **X Developer Portal でクレジットを購入する（$5〜）**
  - https://developer.x.com → Developer Portal → Billing
  - クレジットカードで購入可能
  - $5 で約 500 ツイート分（約 5〜6 ヶ月）
  
- [ ] **stagingでの動作確認**
  - 管理画面 `/admin/x-posts` にアクセス
  - 「今すぐ投稿」で手動テスト投稿
  - 自動投稿トグルを ON にして GitHub Actions の動作確認

### 🟡 優先度：中

- [ ] **フォロワー獲得のための手動施策**（自動化は利用規約違反リスクがあるため手動）
  - ハッシュタグで同ジャンル投稿を検索してエンゲージメント（いいね・返信）
  - 候補ハッシュタグ: `#タロット` `#タロット占い` `#占い` `#AIタロット` `#今日のタロット`
  - 他占い系アカウントのフォロワーにアプローチ
  - 週1〜2回の手動エンゲージメントが効果的

- [ ] **投稿内容の最適化**
  - 今日のタロット（毎朝）: カード名 + 短いメッセージ + アプリ URL + ハッシュタグ
  - タロット豆知識（昼）: 豆知識 + ハッシュタグ
  - アプリ宣伝（夕）: アプリ機能紹介 + URL + ハッシュタグ
  - AI プロンプトを定期的に見直してエンゲージメント率を改善

### 🟢 優先度：低（将来）

- [ ] **投稿パフォーマンス分析**（X Analytics でエンゲージメント率を追跡）
- [ ] **投稿スケジュールの最適化**（エンゲージメントが高い時間帯に調整）
- [ ] **画像付き投稿**（カード画像を添付するとエンゲージメント UP の可能性）

---

## GitHub Actions Secrets 設定（staging / production）

```
APP_URL          = https://ariadne-ai.app（本番）/ staging URL
CRON_SECRET      = openssl rand -hex 32 で生成した値
```

---

## 参考リンク

- [X Developer Portal](https://developer.x.com)
- [X API Pay-Per-Use 公式発表](https://devcommunity.x.com/t/announcing-the-launch-of-x-api-pay-per-use-pricing/256476)
- [X API Pricing ページ](https://docs.x.com/x-api/getting-started/pricing)
