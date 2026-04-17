# UI デザインガイドライン

## 絵文字の使用禁止

- **🔮（水晶玉）絵文字は使用禁止**。タロット占いアプリなので絵文字でなくカード画像を使うこと
- その他の装飾的絵文字もサインインページ・マーケティングページでは使用しない

## タロットカードファン（3枚）

アプリのロゴ・アイコン代わりにタロットカード3枚のファン表示を使う。

```tsx
// 裏面×2（左右に傾けて配置）＋ 表面×1（中央、最前面）
<div className="relative w-36 h-24 flex-shrink-0">
  <Image src="/cards/back.png" ... style={{ transform: "rotate(-12deg)" }} />  {/* 左・奥 */}
  <Image src="/cards/back.png" ... style={{ transform: "rotate(12deg)" }} />   {/* 右・奥 */}
  <Image src="/cards/0_fool.png" ... className="... z-10" />                   {/* 中央・手前 */}
</div>
```

- カードファイルは `/public/cards/` 以下（`back.png`、`0_fool.png` 等）
- タロティスト画像は `/public/tarotists/{Name}.png`
