import { adminAuth } from "@/admin-auth";
import { prisma } from "@/prisma/prisma";
import { UsersPageClient } from "./users-page-client";

export default async function UsersPage() {
  const [session, adminUsers] = await Promise.all([
    adminAuth(),
    prisma.adminUser.findMany({
      select: { id: true, name: true, email: true, image: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <UsersPageClient
      users={adminUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        createdAt: u.createdAt.toISOString(),
      }))}
      currentUserId={session?.user?.id ?? ""}
    />
  );
}
