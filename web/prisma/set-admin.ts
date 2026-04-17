import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const email = process.argv[2];

if (!email) {
  console.error("Usage: npx tsx prisma/set-admin.ts <email>");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
    select: { id: true, email: true, role: true },
  });
  console.log(`✅ ${user.email} のロールを ADMIN に設定しました`);
}

main()
  .catch((e) => {
    console.error("❌ エラー:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
