import { planService } from "@/lib/server/services/plan";
import { spreadService } from "@/lib/server/services/spread";
import { SpreadsPageClient } from "./spreads-page-client";

export default async function SpreadsPage() {
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
