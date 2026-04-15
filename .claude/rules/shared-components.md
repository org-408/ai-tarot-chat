---
paths:
  - "shared/**"
---

# Shared コンポーネントルール

## 設計思想

`shared/` はモバイル・Web・デスクトップの **3 プラットフォームが共通で使う** コンポーネント・フック・型定義を置く場所。プラットフォーム固有の依存を一切持たない。

```
shared/
  components/       ← platform-agnostic な React コンポーネント
    chat/           ChatView, ChatInput, MessageBubble, MessageContent
    reading/        CategorySpreadSelector, TarotistSelector, RevealPromptPanel, ShuffleDialog
    tarot/          SpreadViewer, TarotCardImage, UpperViewer, LowerViewer
    ui/             Accordion, ScrollableRadioSelector
  hooks/
    use-chat-session.ts   ← SSE + セッション管理
    use-tarot-draw.ts
  lib/
    types.ts        ← 全プラットフォーム共有型定義
```

## 禁止事項

shared コンポーネント・フックに以下を import してはいけない:

```typescript
// ❌ 禁止 — プラットフォーム固有
import { useRouter } from "next/navigation";       // Next.js 専用
import { IonButton } from "@ionic/react";          // Ionic 専用
import { Capacitor } from "@capacitor/core";       // Capacitor 専用
import { useTranslations } from "next-intl";       // next-intl は Web 専用
import { Keyboard } from "@capacitor/keyboard";    // Capacitor 専用
```

```typescript
// ✅ 許可 — React 標準・汎用ライブラリ
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { SomeType } from "@shared/lib/types";
```

## i18n（翻訳文字列の渡し方）

shared コンポーネントは `useTranslations` を使わない。文字列を **`labels` prop** で受け取る。

```typescript
// shared/components/reading/tarotist-selector.tsx
export interface TarotistSelectorLabels {
  premiumBadge: string;   // 例: "✨ プレミアム"
  planRequired: string;   // 例: "🔒 このプランでは利用できません"
  noTarotists: string;    // 例: "占い師がいません"
}

interface TarotistSelectorProps {
  tarotists: Tarotist[];
  labels?: TarotistSelectorLabels;  // 省略可能（デフォルト値を内部で持つ）
  // ...
}
```

**呼び出し側（Web）:**
```typescript
// web/app/[locale]/(app)/salon/page.tsx
const t = useTranslations("tarotist");
<TarotistSelector
  labels={{
    premiumBadge: `✨ ${t("premiumOnly")}`,
    planRequired: `🔒 ${t("locked")}`,
    noTarotists: t("noTarotists"),
  }}
/>
```

## プラットフォームアダプターパターン

モバイルとWebで実装が異なるネイティブ機能は **アダプターインターフェース** で抽象化する。

```typescript
// shared/hooks/use-chat-session.ts
export interface ChatSessionAdapters {
  /** キーボード高さを取得（mobile: Capacitor Keyboard, web: visualViewport） */
  useKeyboardHeight?: () => number;
  /** アプリがフォアグラウンドに戻った時のコールバック登録 */
  useAppStateCallback?: (cb: () => void) => void;
}

export function useChatSession(
  params: ChatSessionParams,
  adapters: ChatSessionAdapters = {}
) {
  const keyboardHeight = adapters.useKeyboardHeight?.() ?? 0;
  // ...
}
```

**プラットフォーム側での組み立て:**
```typescript
// mobile: ChatPanel.tsx
<ChatView
  {...useChatSession(params, {
    useKeyboardHeight: useCapacitorKeyboardHeight,
    useAppStateCallback: useCapacitorAppState,
  })}
/>

// web: ChatPanel.tsx
<ChatView
  {...useChatSession(params, {
    useKeyboardHeight: useVisualViewportHeight,
    useAppStateCallback: usePageVisibilityCallback,
  })}
/>
```

## 型定義 (`shared/lib/types.ts`)

- すべての共有ドメイン型はここに定義
- `interface` ではなく `type` エイリアスを使う
- Prisma 生成型（`@prisma/client`）を直接 export しない — shared 型として再定義する
- `ChatRole` / `ChatType` などの enum は `@prisma/client` からインポートして再 export してよい

```typescript
// ✅ 正しい
export type Client = {
  id: string;
  email: string | null;
  plan: Plan | null;
  // ...
};

// ❌ 禁止: Prisma の型をそのまま使わない
import type { Client } from "@prisma/client"; // web 専用パスが混入する
```

## パスエイリアス

```typescript
// web から shared を参照
import { SomeType } from "@shared/lib/types";
import { ChatView } from "@shared/components/chat/chat-view";

// mobile から shared を参照（同じエイリアス）
import { SomeType } from "@shared/lib/types";
```

`@shared/*` は `web/tsconfig.json` と `mobile/tsconfig.app.json` の両方に定義済み。

## Tailwind CSS

shared コンポーネントの Tailwind クラスは Web・モバイルの両方で読み込まれるよう設定済み。

```css
/* web/app/globals.css */
@source "../../shared/components/**/*.{ts,tsx}";

/* mobile/src/index.css */
@source "../../shared/components/**/*.{ts,tsx}";
```

新しい shared コンポーネントを追加しても Tailwind の `content` 設定を変更する必要はない（グロブが自動で対応する）。

## コンポーネントの Props 設計

```typescript
// ✅ 汎用的な設計 — プラットフォームを意識させない
interface SpreadViewerProps {
  spread: Spread;
  drawnCards: DrawnCard[];
  onCardSelect?: (index: number) => void;
  className?: string;
}

// ❌ プラットフォーム固有の prop を持ち込まない
interface SpreadViewerProps {
  navigation: NavigationProp; // React Navigation (mobile)
  router: AppRouterInstance;  // Next.js (web)
}
```

## ファイル命名

| 対象 | 規則 | 例 |
|---|---|---|
| コンポーネントファイル | kebab-case | `chat-view.tsx` |
| フックファイル | `use-*.ts` | `use-chat-session.ts` |
| 型定義 | `types.ts` | `shared/lib/types.ts` |
| コンポーネント名 | PascalCase | `ChatView` |
| フック名 | `use*` camelCase | `useChatSession` |
