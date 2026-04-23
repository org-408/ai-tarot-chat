import { prisma } from "@/lib/server/repositories/database";
import { rankingService } from "@/lib/server/services/ranking";
import { RankingKind } from "@/lib/generated/prisma/client";
import { RankingAdminPageClient } from "./ranking-admin-page-client";

export default async function RankingAdminPage() {
  const [overrides, snapshots, tarotists, spreads, categories, cards] =
    await Promise.all([
      rankingService.listOverrides(),
      rankingService.getSnapshotSummary(),
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
      snapshots={snapshots.map((s) => ({
        kind: s.kind,
        generatedAt: s.generatedAt ? s.generatedAt.toISOString() : null,
        entries: s.entries,
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
