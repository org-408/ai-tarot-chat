# 課金アーキテクチャ

## 概要

RevenueCat をエンタイトルメント管理の中心に置き、iOS / Android / Web のプランを統一管理する。

## 手数料の仕組み

| 購入場所 | 決済 | 手数料 | 手取り（¥1,000 の場合） |
|---|---|---|---|
| App Store | Apple | ~30% | ¥700 |
| Google Play | Google | ~30% | ¥700 |
| Web | Stripe | ~3% | ¥970 |

- 手数料は購入した場所で一回だけ発生
- Web 購入が運営にとって最も有利

## クロスプラットフォーム共有の仕組み

```
iOS 購入  ─→ RC Entitlement "premium" ─┐
Android 購入 → RC Entitlement "premium" ─┼→ 同一 userId → 全プラットフォームで有効
Web 購入  ─→ RC Entitlement "premium" ─┘
```

### 必要条件

1. **RC ダッシュボード設定**
   - iOS App Store アプリ登録
   - Google Play アプリ登録
   - 各プラン商品を同一 Entitlement にマッピング

2. **コード側**（実装済み）
   - `Purchases.login(userId)` で同一ユーザーとして認識

## Web 課金の実装方針

Issue #88 参照。以下の2案で検討中：

### 案 B: RevenueCat の Stripe ネイティブ連携
- RC ダッシュボードで Stripe アカウントを接続するだけ
- Stripe 購入 → RC が自動検知 → エンタイトルメント付与
- カスタムコードほぼ不要

### 案 C: RevenueCat Billing
- RC 自身の Web 課金機能
- Stripe を経由しない
- モバイルとの連携が完璧

## Apple ガイドライン上の注意点

- アプリ**内**で「Web で買うと安い」という誘導は規約違反
- アプリ外で Web 購入し、そのエンタイトルメントをアプリで使うのは合法（Netflix モデル）
