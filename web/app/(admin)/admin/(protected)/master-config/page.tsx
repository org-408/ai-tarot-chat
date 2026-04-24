import { masterConfigRepository } from "@/lib/server/repositories";
import { assertAdminSession } from "@/lib/server/utils/admin-guard";
import { MasterConfigPageClient } from "./master-config-page-client";

export default async function MasterConfigPage() {
  await assertAdminSession();

  const configs = await masterConfigRepository.listAllMasterConfigs();
  const rows = configs.map((c) => ({
    id: c.id,
    key: c.key,
    version: c.version,
    description: c.description,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return <MasterConfigPageClient configs={rows} />;
}
