import { auth } from "@/auth";
import { TauriAuthResult } from "@/components/auth/tauri-auth-result";

export default async function TauriCallbackPage() {
  const session = await auth();

  // Auth.jsのコールバックで既にユーザー登録完了済み
  if (!session) {
    return <TauriAuthResult success={false} error="認証に失敗しました" />;
  }

  // ユーザー登録は既に完了しているので、結果だけ返す
  return <TauriAuthResult success={true} session={session} />;
}
