import { adminAuth } from "@/admin-auth";
import { prisma } from "@/prisma/prisma";
import { UsersPageClient } from "./users-page-client";

export default async function UsersPage() {
  const [session, users] = await Promise.all([
    adminAuth(),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <UsersPageClient
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
      }))}
      currentUserId={session?.user?.id ?? ""}
    />
  );
}
