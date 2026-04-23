import { prisma } from "@/lib/server/repositories/database";
import { rankingService } from "@/lib/server/services/ranking";
import { rankingConfigService } from "@/lib/server/services/ranking-config";
import { RankingKind } from "@/lib/generated/prisma/client";
import { RankingAdminPageClient } from "./ranking-admin-page-client";

export default async function RankingAdminPage() {
  const [config, summary, overrides, tarotists, spreads, categories, cards] =
    await Promise.all([
      rankingConfigService.get(),
      rankingService.getAdminSummary(),
      rankingService.listOverrides(),
      prisma.tarotist.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, icon: true },
        orderBy: { no: "asc" },
      }),
      prisma.spread.findMany({
        select: { id: true, name: true },
        orderBy: { no: "asc" },
      }),
      prisma.readingCategory.findMany({
        select: { id: true, name: true },
        orderBy: { no: "asc" },
      }),
      prisma.tarotCard.findMany({
        where: { language: "ja" },
        select: { id: true, name: true, code: true },
        orderBy: { no: "asc" },
      }),
    ]);

  return (
    <RankingAdminPageClient
      config={{
        collectionEnabled: config.collectionEnabled,
        publicEnabled: config.publicEnabled,
        updatedBy: config.updatedBy,
        updatedAt: config.updatedAt.toISOString(),
      }}
      summary={summary.map((s) => ({
        kind: s.kind,
        latestPeriodEnd: s.latestPeriodEnd
          ? s.latestPeriodEnd.toISOString()
          : null,
        bucketCount7d: s.bucketCount7d,
        bucketStarts7d: s.bucketStarts7d.map((d) => d.toISOString()),
      }))}
      overrides={overrides.map((o) => ({
        id: o.id,
        kind: o.kind,
        targetId: o.targetId,
        rank: o.rank,
        isActive: o.isActive,
        note: o.note,
        updatedBy: o.updatedBy,
        updatedAt: o.updatedAt.toISOString(),
      }))}
      targets={{
        [RankingKind.TAROTIST]: tarotists.map((t) => ({
          id: t.id,
          name: `${t.icon} ${t.name}`,
        })),
        [RankingKind.SPREAD]: spreads.map((s) => ({ id: s.id, name: s.name })),
        [RankingKind.CATEGORY]: categories.map((c) => ({
          id: c.id,
          name: c.name,
        })),
        [RankingKind.PERSONAL_CATEGORY]: categories.map((c) => ({
          id: c.id,
          name: c.name,
        })),
        [RankingKind.CARD]: cards.map((c) => ({
          id: c.id,
          name: `${c.code} - ${c.name}`,
        })),
      }}
    />
  );
}
