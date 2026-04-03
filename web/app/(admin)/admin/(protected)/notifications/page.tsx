import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { NotificationsPageClient } from "./notifications-page-client";

export default async function NotificationsPage() {
  await assertAdminSession();
  return <NotificationsPageClient />;
}
