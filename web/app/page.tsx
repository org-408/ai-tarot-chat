import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * スマートエントリ
 * - ログイン済み → /salon（アプリ直行）
 * - 未ログイン  → /ja（デフォルトロケールの LP）
 */
export default async function RootPage() {
  const session = await auth();
  redirect(session ? "/salon" : "/ja");
}
