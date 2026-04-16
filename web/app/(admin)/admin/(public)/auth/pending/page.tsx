import { adminAuth, adminRawAuth } from "@/admin-auth";
import { adminUserService } from "@/lib/server/services";
import { redirect } from "next/navigation";
import { PendingWithCodeInput, PendingWaiting } from "./pending-client";

export default async function PendingPage() {
  // すでにアクティブな場合は管理画面へ
  const activeSession = await adminAuth();
  if (activeSession) {
    redirect("/admin");
  }

  // 未サインインの場合はサインインへ
  const session = await adminRawAuth();
  if (!session?.user?.email) {
    redirect("/admin/auth/signin");
  }

  const email = session.user.email;
  const hasToken = await adminUserService.hasValidInviteToken(email);

  if (hasToken) {
    return <PendingWithCodeInput email={email} />;
  }

  return <PendingWaiting email={email} />;
}
