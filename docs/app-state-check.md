excellent question! 状態の整合性チェックとリセット戦略を整理しましょう。

## 状態のパターンと対応方針

### **チェックすべき状態の組み合わせ**

```typescript
// lib/utils/stateCheck.ts

interface AppState {
  token: string | null;
  deviceId: string | null;
  clientId: string | null;
  userId: string | null;
}

interface StateCheckResult {
  action: "none" | "reset_client" | "reset_all" | "require_reauth";
  reason: string;
  userData?: { email: string; userId: string };
}
```

### **状態パターンと判断ロジック**

| パターン              | token | deviceId | clientId | userId | 判断                     | アクション     |
| --------------------- | ----- | -------- | -------- | ------ | ------------------------ | -------------- |
| 1️⃣ 正常               | ✅    | ✅       | ✅       | ✅/-   | すべて一致               | none           |
| 2️⃣ トークン期限切れ   | ✅    | ✅       | ✅       | ✅/-   | 期限切れのみ             | none (refresh) |
| 3️⃣ トークン不整合     | ✅    | ❌       | -        | -      | deviceId 不一致          | reset_client   |
| 4️⃣ トークン破損(軽度) | ❌    | ✅       | ✅       | -      | token 消失、他は正常     | reset_client   |
| 5️⃣ トークン破損(重度) | ❌    | ✅       | ✅       | ✅     | token 消失、ユーザーあり | require_reauth |
| 6️⃣ 部分的データ残存   | ❌    | ✅       | ❌       | -      | deviceId のみ            | reset_client   |
| 7️⃣ 孤立ユーザーデータ | ❌    | -        | -        | ✅     | userId のみ              | reset_all      |
| 8️⃣ 完全初回起動       | ❌    | ❌       | ❌       | ❌     | 何もない                 | none           |

## 実装

### **1. Capacitor 側: 状態収集と送信**

```typescript
// lib/utils/stateCheck.ts
import { Preferences } from "@capacitor/preferences";
import { storeRepository } from "../repositories/store";
import { decodeJWT } from "./jwt";

const JWT_SECRET = import.meta.env.VITE_AUTH_SECRET;

/**
 * 現在のアプリ状態を収集
 */
async function collectAppState(): Promise<AppState> {
  const token = await storeRepository.get<string>("accessToken");
  const deviceId = await storeRepository.get<string>("deviceId");
  const clientId = await storeRepository.get<string>("clientId");
  const userId = await storeRepository.get<string>("userId");

  return { token, deviceId, clientId, userId };
}

/**
 * トークンから情報を抽出（破損してない場合）
 */
async function extractTokenInfo(token: string): Promise<{
  deviceId?: string;
  clientId?: string;
  userId?: string;
  isExpired: boolean;
} | null> {
  try {
    const payload = await decodeJWT<any>(token, JWT_SECRET);
    return {
      deviceId: payload.deviceId,
      clientId: payload.clientId,
      userId: payload.user?.id,
      isExpired: payload.exp && Date.now() >= payload.exp * 1000,
    };
  } catch {
    return null; // トークン破損
  }
}

/**
 * サーバーに状態チェックを依頼
 */
export async function checkServerState(): Promise<StateCheckResult> {
  try {
    const state = await collectAppState();
    let tokenInfo = null;

    // トークンがあれば解析を試みる
    if (state.token) {
      tokenInfo = await extractTokenInfo(state.token);
    }

    console.log("[StateCheck] Current state:", { state, tokenInfo });

    const response = await fetch("https://your-api.com/api/app/check-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: state.token,
        tokenInfo, // サーバー側で検証するため
        deviceId: state.deviceId,
        clientId: state.clientId,
        userId: state.userId,
      }),
    });

    const result: StateCheckResult = await response.json();
    console.log("[StateCheck] Server response:", result);

    return result;
  } catch (error) {
    console.error("[StateCheck] Failed to check server state:", error);
    // エラー時は何もしない（安全側）
    return { action: "none", reason: "check_failed" };
  }
}

/**
 * 状態に応じたリセット実行
 */
export async function handleStateAction(
  result: StateCheckResult
): Promise<void> {
  switch (result.action) {
    case "none":
      console.log("[StateCheck] No action needed");
      break;

    case "reset_client":
      console.log("[StateCheck] Resetting client storage:", result.reason);
      await clearAllStores();
      break;

    case "reset_all":
      console.log("[StateCheck] Full reset requested:", result.reason);
      await clearAllStores();
      // サーバーにリセット完了を通知
      await notifyResetComplete();
      break;

    case "require_reauth":
      console.log("[StateCheck] Re-authentication required:", result.reason);
      await clearAllStores();
      // ユーザーに再ログインを促す
      if (result.userData) {
        alert(
          `${result.userData.email} でログインし直してください。\n` +
            `理由: ${result.reason}`
        );
      }
      break;
  }
}

/**
 * 全ストアをクリア
 */
async function clearAllStores(): Promise<void> {
  await Preferences.clear();
  await storeRepository.delete("auth-storage");
  await storeRepository.delete("daily-limit-storage");
  console.log("[StateCheck] All stores cleared");
}

/**
 * リセット完了をサーバーに通知
 */
async function notifyResetComplete(): Promise<void> {
  try {
    await fetch("https://your-api.com/api/app/reset-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[StateCheck] Failed to notify reset:", error);
  }
}
```

### **2. Server 側: 状態検証ロジック**

```typescript
// app/api/app/check-state/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth"; // あなたのJWT検証関数

interface StateCheckRequest {
  token: string | null;
  tokenInfo: any;
  deviceId: string | null;
  clientId: string | null;
  userId: string | null;
}

export async function POST(request: NextRequest) {
  const body: StateCheckRequest = await request.json();

  console.log("[Server] State check request:", body);

  // パターン1: トークンがある場合
  if (body.token && body.tokenInfo) {
    return await checkWithToken(body);
  }

  // パターン2: トークンがない場合
  return await checkWithoutToken(body);
}

/**
 * トークンがある場合のチェック
 */
async function checkWithToken(body: StateCheckRequest) {
  const { tokenInfo, deviceId, clientId, userId } = body;

  // トークンの署名検証（改ざんチェック）
  try {
    await verifyJWT(body.token!);
  } catch {
    return NextResponse.json({
      action: "reset_client",
      reason: "トークンが改ざんされています",
    });
  }

  // サーバー側のデータと照合
  const serverData = await db.query(
    "SELECT device_id, client_id, user_id FROM clients WHERE client_id = ?",
    [tokenInfo.clientId]
  );

  if (!serverData) {
    // サーバーにclientIdが存在しない
    return NextResponse.json({
      action: "reset_all",
      reason: "サーバー側にクライアント情報がありません",
    });
  }

  // 不整合チェック
  if (
    tokenInfo.deviceId !== deviceId ||
    tokenInfo.clientId !== clientId ||
    (tokenInfo.userId && tokenInfo.userId !== userId)
  ) {
    return NextResponse.json({
      action: "reset_client",
      reason: "ストレージとトークンの内容が一致しません",
    });
  }

  // サーバー側とトークンの不整合
  if (
    serverData.device_id !== tokenInfo.deviceId ||
    serverData.client_id !== tokenInfo.clientId
  ) {
    return NextResponse.json({
      action: "reset_client",
      reason: "サーバーとトークンの内容が一致しません",
    });
  }

  // 期限切れはここではOK（refreshで対応）
  if (tokenInfo.isExpired) {
    console.log("[Server] Token expired, will refresh");
  }

  return NextResponse.json({ action: "none", reason: "ok" });
}

/**
 * トークンがない場合のチェック
 */
async function checkWithoutToken(body: StateCheckRequest) {
  const { deviceId, clientId, userId } = body;

  // ケース8: 完全初回起動（何もない）
  if (!deviceId && !clientId && !userId) {
    return NextResponse.json({ action: "none", reason: "first_launch" });
  }

  // ケース7: userIdだけ残っている（孤立データ）
  if (userId && !deviceId && !clientId) {
    // サーバーにユーザー情報があるか確認
    const user = await db.query("SELECT email FROM users WHERE id = ?", [
      userId,
    ]);

    if (user) {
      return NextResponse.json({
        action: "require_reauth",
        reason: "トークンが失われました。再度ログインしてください。",
        userData: { email: user.email, userId },
      });
    } else {
      // ユーザーも存在しない = 完全に孤立
      return NextResponse.json({
        action: "reset_all",
        reason: "無効なユーザーIDです",
      });
    }
  }

  // ケース4,5,6: トークン破損、他のデータは残存
  if (clientId) {
    const client = await db.query(
      "SELECT device_id, user_id FROM clients WHERE client_id = ?",
      [clientId]
    );

    if (!client) {
      // サーバーにclientIdが存在しない
      return NextResponse.json({
        action: "reset_all",
        reason: "無効なクライアントIDです",
      });
    }

    // deviceIdの整合性チェック
    if (deviceId && client.device_id !== deviceId) {
      return NextResponse.json({
        action: "reset_client",
        reason: "デバイスIDが一致しません",
      });
    }

    // userIdがある場合（ケース5）
    if (userId && client.user_id) {
      const user = await db.query("SELECT email FROM users WHERE id = ?", [
        userId,
      ]);

      return NextResponse.json({
        action: "require_reauth",
        reason: "トークンが失われました。再度ログインしてください。",
        userData: user ? { email: user.email, userId } : undefined,
      });
    }

    // ケース4,6: userIdがない、または軽度の破損
    return NextResponse.json({
      action: "reset_client",
      reason: "トークンが破損しています",
    });
  }

  // その他の予期しないケース
  return NextResponse.json({
    action: "reset_client",
    reason: "不明な状態です",
  });
}
```

### **3. lifecycle.ts での使用**

```typescript
// lifecycle.ts の init() を修正
init: async () => {
  // ... 既存のチェック ...

  try {
    // 🔥 状態チェック
    const checkResult = await checkServerState();

    if (checkResult.action !== 'none') {
      logWithContext("info", "[Lifecycle] State action required:", checkResult);
      await handleStateAction(checkResult);
    }

    // 以下、既存の初期化処理
    await useAuthStore.getState().init();
    // ...
  }
  // ...
}
```

## 重要な判断基準

### **クライアント側だけリセット (`reset_client`)**

- トークンとストレージの軽微な不整合
- トークン破損だが、サーバー側データは正常
- → 再登録で自動復旧可能

### **完全リセット (`reset_all`)**

- サーバー側にデータが存在しない
- 完全に矛盾した状態
- → 新規デバイスとして扱う

### **再認証要求 (`require_reauth`)**

- ユーザー登録済みだが、トークン破損
- → ユーザーデータ保護のため、再ログインを促す
- サーバー側データは削除しない

いかがでしょうか？
