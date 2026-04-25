import { RankingKind } from "@/lib/generated/prisma/client";
import { BaseRepository } from "./base";

export { RankingKind };

export type BucketEntry = {
  targetId: string;
  count: number;
};

export type AggregatedRankingRow = {
  targetId: string;
  total: number;
};

export class RankingRepository extends BaseRepository {
  // -------- バケット集計（cron） --------

  /**
   * 期間内の Reading/DrawnCard を種別ごとに集計して返す。
   * INSERT は呼び出し側の責務（このメソッドは純粋な集計）。
   */
  async aggregateBucket(
    kind: RankingKind,
    periodStart: Date,
    periodEnd: Date
  ): Promise<BucketEntry[]> {
    switch (kind) {
      case RankingKind.TAROTIST: {
        const rows = await this.db.reading.groupBy({
          by: ["tarotistId"],
          where: { createdAt: { gte: periodStart, lt: periodEnd } },
          _count: { tarotistId: true },
        });
        return rows.map((r) => ({ targetId: r.tarotistId, count: r._count.tarotistId }));
      }
      case RankingKind.SPREAD: {
        const rows = await this.db.reading.groupBy({
          by: ["spreadId"],
          where: { createdAt: { gte: periodStart, lt: periodEnd } },
          _count: { spreadId: true },
        });
        return rows.map((r) => ({ targetId: r.spreadId, count: r._count.spreadId }));
      }
      case RankingKind.CATEGORY: {
        const rows = await this.db.reading.groupBy({
          by: ["categoryId"],
          where: {
            createdAt: { gte: periodStart, lt: periodEnd },
            categoryId: { not: null },
          },
          _count: { categoryId: true },
        });
        return rows
          .filter((r): r is typeof r & { categoryId: string } => r.categoryId !== null)
          .map((r) => ({ targetId: r.categoryId, count: r._count.categoryId }));
      }
      case RankingKind.PERSONAL_CATEGORY: {
        const rows = await this.db.reading.groupBy({
          by: ["categoryId"],
          where: {
            createdAt: { gte: periodStart, lt: periodEnd },
            categoryId: { not: null },
            mode: "PERSONAL",
          },
          _count: { categoryId: true },
        });
        return rows
          .filter((r): r is typeof r & { categoryId: string } => r.categoryId !== null)
          .map((r) => ({ targetId: r.categoryId, count: r._count.categoryId }));
      }
      case RankingKind.CARD: {
        const rows = await this.db.drawnCard.groupBy({
          by: ["cardId"],
          where: { createdAt: { gte: periodStart, lt: periodEnd } },
          _count: { cardId: true },
        });
        return rows.map((r) => ({ targetId: r.cardId, count: r._count.cardId }));
      }
    }
  }

  /** 単一バケットの結果をトランザクションで差し替え（= 削除 → 再挿入）。 */
  async upsertBucket(
    kind: RankingKind,
    periodStart: Date,
    periodEnd: Date,
    entries: BucketEntry[],
    generatedAt: Date
  ): Promise<void> {
    await this.transaction(async (tx) => {
      await tx.rankingSnapshot.deleteMany({
        where: { kind, periodStart },
      });
      if (entries.length === 0) return;
      await tx.rankingSnapshot.createMany({
        data: entries.map((e) => ({
          kind,
          targetId: e.targetId,
          count: e.count,
          periodStart,
          periodEnd,
          generatedAt,
        })),
      });
    });
  }

  // -------- 公開側：期間 SUM 取得 --------

  /** 指定期間の SUM を取得して Top N を返す */
  async sumOverPeriod(
    kind: RankingKind,
    from: Date,
    limit: number
  ): Promise<AggregatedRankingRow[]> {
    const rows = await this.db.rankingSnapshot.groupBy({
      by: ["targetId"],
      where: { kind, periodStart: { gte: from } },
      _sum: { count: true },
      orderBy: { _sum: { count: "desc" } },
      take: limit,
    });
    return rows.map((r) => ({ targetId: r.targetId, total: r._sum.count ?? 0 }));
  }

  async latestPeriodEnd(kind: RankingKind): Promise<Date | null> {
    const row = await this.db.rankingSnapshot.findFirst({
      where: { kind },
      orderBy: { periodEnd: "desc" },
      select: { periodEnd: true },
    });
    return row?.periodEnd ?? null;
  }

  // -------- Admin: 期間オペ --------

  /** 期間内のバケットを削除（kind 指定なしなら全種別） */
  async deleteBucketsInRange(from: Date, to: Date, kind?: RankingKind) {
    return this.db.rankingSnapshot.deleteMany({
      where: {
        ...(kind ? { kind } : {}),
        periodStart: { gte: from, lt: to },
      },
    });
  }

  /** 種別の全バケットを削除（リセット） */
  async deleteAllByKind(kind: RankingKind) {
    return this.db.rankingSnapshot.deleteMany({ where: { kind } });
  }

  /** 指定範囲で、存在するバケットの periodStart 一覧を返す（欠損検出用） */
  async listBucketStartsInRange(
    kind: RankingKind,
    from: Date,
    to: Date
  ): Promise<Date[]> {
    const rows = await this.db.rankingSnapshot.findMany({
      where: { kind, periodStart: { gte: from, lt: to } },
      select: { periodStart: true },
      distinct: ["periodStart"],
      orderBy: { periodStart: "asc" },
    });
    return rows.map((r) => r.periodStart);
  }

  /** 直近バケットを kind ごとに返す（管理画面の状態表示用） */
  async getRecentBuckets(kind: RankingKind, hours: number) {
    const from = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.db.rankingSnapshot.findMany({
      where: { kind, periodStart: { gte: from } },
      orderBy: [{ periodStart: "desc" }, { count: "desc" }],
    });
  }

  // -------- Override --------

  async getActiveOverrides(kind: RankingKind, limit: number) {
    return this.db.rankingOverride.findMany({
      where: { kind, isActive: true },
      orderBy: { rank: "asc" },
      take: limit,
    });
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
}

export const rankingRepository = new RankingRepository();
