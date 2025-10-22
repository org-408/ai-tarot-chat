import { seedService } from "@/lib/server/services/seed";

export async function main() {
  await seedService.seedDatabase();
}

main();
