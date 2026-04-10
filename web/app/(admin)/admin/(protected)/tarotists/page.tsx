import { planService } from "@/lib/server/services/plan";
import { tarotistService } from "@/lib/server/services/tarotist";
import { TarotistsPageClient } from "./tarotists-page-client";

export default async function TarotistsPage() {

  const [tarotists, plans] = await Promise.all([
    tarotistService.getAllTarotists(false),
    planService.getPlans(),
  ]);

  return <TarotistsPageClient tarotists={tarotists} plans={plans} />;
}
