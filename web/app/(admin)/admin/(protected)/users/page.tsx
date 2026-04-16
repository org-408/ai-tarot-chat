import { adminAuth } from "@/admin-auth";
import { adminService } from "@/lib/server/services/admin";
import { UsersPageClient } from "./users-page-client";

export default async function UsersPage() {
  const [session, adminUsers] = await Promise.all([
    adminAuth(),
    adminService.listAdminUsers(),
  ]);

  return (
    <UsersPageClient
      users={adminUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        createdAt: u.createdAt.toISOString(),
        activatedAt: u.activatedAt?.toISOString() ?? null,
      }))}
      currentUserId={session?.user?.id ?? ""}
    />
  );
}
