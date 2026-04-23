import { featureFlagService } from "@/lib/server/services/feature-flag";
import { FeatureFlagsPageClient } from "./feature-flags-page-client";

export default async function FeatureFlagsPage() {
  const flags = await featureFlagService.list();
  const rows = flags.map((f) => ({
    key: f.key,
    enabled: f.enabled,
    description: f.description,
    updatedBy: f.updatedBy,
    updatedAt: f.updatedAt ? f.updatedAt.toISOString() : null,
    persisted: f.persisted,
  }));
  return <FeatureFlagsPageClient flags={rows} />;
}
