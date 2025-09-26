import type { Client, ClientInput } from "@/../shared/lib/types";

/**
 * ユーザー一覧を取得
 */
export async function fetchClients(): Promise<Client[]> {
  const response = await fetch("/api/clients");
  if (!response.ok) {
    throw new Error("ユーザー一覧の取得に失敗しました");
  }
  return response.json();
}

/**
 * 特定のユーザーをIDで取得
 */
export async function fetchClientById(id: string): Promise<Client> {
  const response = await fetch(`/api/clients/${id}`);
  if (!response.ok) {
    throw new Error(`ユーザーID: ${id}の取得に失敗しました`);
  }
  return response.json();
}

/**
 * ユーザーをメールアドレスで取得
 */
export async function fetchClientByEmail(
  email: string
): Promise<Client | null> {
  const response = await fetch(
    `/api/clients/email/${encodeURIComponent(email)}`
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`メールアドレス: ${email}のユーザー取得に失敗しました`);
  }
  return response.json();
}

/**
 * ユーザーをデバイスIDで取得
 */
export async function fetchClientByDeviceId(
  deviceId: string
): Promise<Client | null> {
  const response = await fetch(
    `/api/clients/device/${encodeURIComponent(deviceId)}`
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`デバイスID: ${deviceId}のユーザー取得に失敗しました`);
  }
  return response.json();
}

/**
 * 新規ユーザーを作成
 */
export async function createClient(data: ClientInput): Promise<Client> {
  const response = await fetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("ユーザーの作成に失敗しました");
  }
  return response.json();
}

/**
 * 匿名ユーザーを作成（初回アクセス時）
 */
export async function createAnonymousClient(deviceId: string): Promise<Client> {
  const response = await fetch("/api/clients/anonymous", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });
  if (!response.ok) {
    throw new Error("匿名ユーザーの作成に失敗しました");
  }
  return response.json();
}

/**
 * ユーザー情報を更新
 */
export async function updateClient(
  id: string,
  data: Partial<ClientInput>
): Promise<Client> {
  const response = await fetch(`/api/clients/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`ユーザーID: ${id}の更新に失敗しました`);
  }
  return response.json();
}

/**
 * 匿名ユーザーから登録ユーザーへアップグレード
 */
export async function upgradeToRegisteredClient(
  id: string,
  email: string
): Promise<Client> {
  const response = await fetch(`/api/clients/${id}/upgrade`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    throw new Error(`ユーザーID: ${id}のアップグレードに失敗しました`);
  }
  return response.json();
}

/**
 * ユーザーのプラン変更
 */
export async function updateClientPlan(
  id: string,
  planType: "FREE" | "STANDARD" | "PREMIUM",
  subscriptionStatus: "ACTIVE" | "INACTIVE" | "CANCELED" | "EXPIRED",
  subscriptionEndDate?: Date
): Promise<Client> {
  const response = await fetch(`/api/clients/${id}/plan`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planType, subscriptionStatus, subscriptionEndDate }),
  });
  if (!response.ok) {
    throw new Error(`ユーザーID: ${id}のプラン変更に失敗しました`);
  }
  return response.json();
}

/**
 * ユーザーを削除
 */
export async function deleteClient(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/clients/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`ユーザーID: ${id}の削除に失敗しました`);
  }
  return response.json();
}

/**
 * リーディング利用回数を増加
 */
export async function incrementReadingCount(id: string): Promise<{
  id: string;
  dailyReadingsCount: number;
  lastReadingDate: Date;
}> {
  const response = await fetch(`/api/clients/${id}/reading-count`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`ユーザーID: ${id}のリーディング回数更新に失敗しました`);
  }
  return response.json();
}

/**
 * AIチャット利用回数を増加
 */
export async function incrementAiChatCount(id: string): Promise<{
  id: string;
  dailyAiChatCount: number;
  lastAiChatDate: Date;
}> {
  const response = await fetch(`/api/clients/${id}/ai-chat-count`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`ユーザーID: ${id}のAIチャット回数更新に失敗しました`);
  }
  return response.json();
}

/**
 * リーディング利用制限チェック
 */
export async function checkReadingLimit(id: string): Promise<boolean> {
  const response = await fetch(`/api/clients/${id}/reading-limit`);
  if (!response.ok) {
    throw new Error(
      `ユーザーID: ${id}のリーディング制限チェックに失敗しました`
    );
  }
  const result = await response.json();
  return result.canUse;
}

/**
 * AIチャット利用制限チェック
 */
export async function checkAiChatLimit(id: string): Promise<boolean> {
  const response = await fetch(`/api/clients/${id}/ai-chat-limit`);
  if (!response.ok) {
    throw new Error(`ユーザーID: ${id}のAIチャット制限チェックに失敗しました`);
  }
  const result = await response.json();
  return result.canUse;
}

/**
 * 現在のユーザー情報を取得（認証済みセッションから）
 */
export async function fetchCurrentClient(): Promise<Client | null> {
  const response = await fetch("/api/clients/me");
  if (response.status === 401) {
    return null; // 未認証
  }
  if (!response.ok) {
    throw new Error("現在のユーザー情報の取得に失敗しました");
  }
  return response.json();
}
