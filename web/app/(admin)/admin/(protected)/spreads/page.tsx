import { planService } from "@/lib/server/services/plan";
import { spreadService } from "@/lib/server/services/spread";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { SpreadsPageClient } from "./spreads-page-client";

export default async function SpreadsPage() {
  await assertAdminSession();

  const [initialSpreads, plans, levels, categories] = await Promise.all([
    spreadService.getAllSpreads(),
    planService.getPlans(),
    spreadService.getAllSpreadLevels(),
    spreadService.getAllReadingCategories(),
  ]);

  return (
    <SpreadsPageClient
      initialSpreads={initialSpreads}
      plans={plans}
      levels={levels}
      categories={categories}
    />
  );
}
