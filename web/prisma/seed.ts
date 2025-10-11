import { seedService } from "@/lib/services/seed";

export async function main() {
  await seedService.seedDatabase();
}

main();
