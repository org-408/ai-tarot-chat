import { RankingKind } from "@/lib/generated/prisma/client";
import { BaseRepository } from "./base";

export { RankingKind };

export type RankingEntry = {
  targetId: string;
  count: number;
  rank: number;
};

export class RankingRepository extends BaseRepository {
  // -------- Snapshot read --------

  /** 指定種別の最新スナップショットを取得（上位 limit 件） */
  async getLatestSnapshot(kind: RankingKind, limit: number): Promise<RankingEntry[]> {
    const latest = await this.db.rankingSnapshot.findFirst({
      where: { kind },
      orderBy: { generatedAt: "desc" },
      select: { generatedAt: true },
    });
    if (!latest) return [];
    const rows = await this.db.rankingSnapshot.findMany({
      where: { kind, generatedAt: latest.generatedAt },
      orderBy: { rank: "asc" },
      take: limit,
    });
    return rows.map((r) => ({ targetId: r.targetId, count: r.count, rank: r.rank }));
  }

  async getLatestGeneratedAt(kind: RankingKind): Promise<Date | null> {
    const latest = await this.db.rankingSnapshot.findFirst({
      where: { kind },
      orderBy: { generatedAt: "desc" },
      select: { generatedAt: true },
    });
    return latest?.generatedAt ?? null;
  }

  // -------- Override read --------

  async getActiveOverrides(kind: RankingKind, limit: number): Promise<RankingEntry[]> {
    const rows = await this.db.rankingOverride.findMany({
      where: { kind, isActive: true },
      orderBy: { rank: "asc" },
      take: limit,
    });
    return rows.map((r) => ({ targetId: r.targetId, count: 0, rank: r.rank }));
  }

  async listOverrides(kind?: RankingKind) {
    return this.db.rankingOverride.findMany({
      where: kind ? { kind } : undefined,
      orderBy: [{ kind: "asc" }, { rank: "asc" }],
    });
  }

  async upsertOverride(input: {
    kind: RankingKind;
    targetId: string;
    rank: number;
    isActive: boolean;
    note?: string | null;
    updatedBy?: string | null;
  }) {
    return this.db.rankingOverride.upsert({
      where: { kind_targetId: { kind: input.kind, targetId: input.targetId } },
      update: {
        rank: input.rank,
        isActive: input.isActive,
        note: input.note ?? undefined,
        updatedBy: input.updatedBy ?? undefined,
      },
      create: {
        kind: input.kind,
        targetId: input.targetId,
        rank: input.rank,
        isActive: input.isActive,
        note: input.note ?? null,
        updatedBy: input.updatedBy ?? null,
      },
    });
  }

  async deleteOverride(id: string) {
    await this.db.rankingOverride.delete({ where: { id } });
  }

  // -------- Snapshot write (cron) --------

  /** 指定種別の Snapshot を洗い替え。古い世代も削除してテーブルを肥大化させない */
  async replaceSnapshot(
    kind: RankingKind,
    entries: RankingEntry[],
    generatedAt: Date
  ): Promise<void> {
    await this.transaction(async (tx) => {
      await tx.rankingSnapshot.deleteMany({ where: { kind } });
      if (entries.length === 0) return;
      await tx.rankingSnapshot.createMany({
        data: entries.map((e) => ({
          kind,
          targetId: e.targetId,
          count: e.count,
          rank: e.rank,
          generatedAt,
        })),
      });
    });
  }

  // -------- Aggregation (Reading / DrawnCard) --------

  /** 過去 N 日間の集計 */
  async aggregateTarotist(sinceDays: number, limit: number): Promise<RankingEntry[]> {
    const since = daysAgo(sinceDays);
    const rows = await this.db.reading.groupBy({
      by: ["tarotistId"],
      where: { createdAt: { gte: since } },
      _count: { tarotistId: true },
      orderBy: { _count: { tarotistId: "desc" } },
      take: limit,
    });
    return rows.map((r, i) => ({
      targetId: r.tarotistId,
      count: r._count.tarotistId,
      rank: i + 1,
    }));
  }

  async aggregateSpread(sinceDays: number, limit: number): Promise<RankingEntry[]> {
    const since = daysAgo(sinceDays);
    const rows = await this.db.reading.groupBy({
      by: ["spreadId"],
      where: { createdAt: { gte: since } },
      _count: { spreadId: true },
      orderBy: { _count: { spreadId: "desc" } },
      take: limit,
    });
    return rows.map((r, i) => ({
      targetId: r.spreadId,
      count: r._count.spreadId,
      rank: i + 1,
    }));
  }

  async aggregateCategory(sinceDays: number, limit: number): Promise<RankingEntry[]> {
    const since = daysAgo(sinceDays);
    const rows = await this.db.reading.groupBy({
      by: ["categoryId"],
      where: { createdAt: { gte: since }, categoryId: { not: null } },
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: "desc" } },
      take: limit,
    });
    return rows
      .filter((r): r is typeof r & { categoryId: string } => r.categoryId !== null)
      .map((r, i) => ({ targetId: r.categoryId, count: r._count.categoryId, rank: i + 1 }));
  }

  async aggregatePersonalCategory(sinceDays: number, limit: number): Promise<RankingEntry[]> {
    // パーソナル占い: customQuestion が存在するリーディングに限定
    const since = daysAgo(sinceDays);
    const rows = await this.db.reading.groupBy({
      by: ["categoryId"],
      where: {
        createdAt: { gte: since },
        categoryId: { not: null },
        customQuestion: { not: null },
      },
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: "desc" } },
      take: limit,
    });
    return rows
      .filter((r): r is typeof r & { categoryId: string } => r.categoryId !== null)
      .map((r, i) => ({ targetId: r.categoryId, count: r._count.categoryId, rank: i + 1 }));
  }

  async aggregateCard(sinceDays: number, limit: number): Promise<RankingEntry[]> {
    const since = daysAgo(sinceDays);
    const rows = await this.db.drawnCard.groupBy({
      by: ["cardId"],
      where: { createdAt: { gte: since } },
      _count: { cardId: true },
      orderBy: { _count: { cardId: "desc" } },
      take: limit,
    });
    return rows.map((r, i) => ({
      targetId: r.cardId,
      count: r._count.cardId,
      rank: i + 1,
    }));
  }
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export const rankingRepository = new RankingRepository();
