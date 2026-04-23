import { prisma } from "@/lib/server/repositories/database";
import {
  RankingKind,
  rankingRepository,
  type AggregatedRankingRow,
} from "@/lib/server/repositories/ranking";

export { RankingKind };

// 集計の設計方針
// ---------------------------------------
// - バケット粒度: 1 時間（= 毎時 cron で直前 1 時間分を集計）
// - 公開表示期間: 直近 30 日 × 1時間 = 720 バケットの SUM
// - 集計期間は将来 admin から変更できるようにしても良いが、現状は固定
const BUCKET_MS = 60 * 60 * 1000; // 1h
const PUBLIC_PERIOD_DAYS = 30;
const PUBLIC_LIMIT = 10;
const FALLBACK_THRESHOLD = 3;
const ALL_KINDS: RankingKind[] = [
  RankingKind.TAROTIST,
  RankingKind.SPREAD,
  RankingKind.CATEGORY,
  RankingKind.CARD,
  RankingKind.PERSONAL_CATEGORY,
];

export { ALL_KINDS };

export type RankingItem = {
  rank: number;
  id: string;
  name: string;
  count: number;
  icon?: string | null;
  avatarUrl?: string | null;
  cardCount?: number;
  cardCode?: string;
};

export type RankingResponse = {
  tarotists: RankingItem[];
  spreads: RankingItem[];
  categories: RankingItem[];
  cards: RankingItem[];
  personalCategories: RankingItem[];
  generatedAt: string | null;
  periodDays: number;
};

/**
 * periodEnd を「直近の時間境界 00:00」に切り詰めた Date を返す。
 * 例: 2026-04-23T10:37:12 → 2026-04-23T10:00:00
 */
export function truncateToHour(d: Date): Date {
  const t = new Date(d);
  t.setUTCMilliseconds(0);
  t.setUTCSeconds(0);
  t.setUTCMinutes(0);
  return t;
}

export class RankingService {
  // -------- 公開ページ --------

  async getPublicRanking(): Promise<RankingResponse> {
    const from = new Date(Date.now() - PUBLIC_PERIOD_DAYS * 24 * BUCKET_MS);

    const [tarotists, spreads, categories, cards, personal, latest] = await Promise.all([
      this.loadKind(RankingKind.TAROTIST, from),
      this.loadKind(RankingKind.SPREAD, from),
      this.loadKind(RankingKind.CATEGORY, from),
      this.loadKind(RankingKind.CARD, from),
      this.loadKind(RankingKind.PERSONAL_CATEGORY, from),
      this.getLatestGeneratedAt(),
    ]);

    return {
      tarotists,
      spreads,
      categories,
      cards,
      personalCategories: personal,
      generatedAt: latest ? latest.toISOString() : null,
      periodDays: PUBLIC_PERIOD_DAYS,
    };
  }

  private async loadKind(kind: RankingKind, from: Date): Promise<RankingItem[]> {
    const rows = await rankingRepository.sumOverPeriod(kind, from, PUBLIC_LIMIT);
    // フォールバック: SUM 結果が薄い場合 Override で穴埋め
    if (rows.length < FALLBACK_THRESHOLD) {
      const overrides = await rankingRepository.getActiveOverrides(kind, PUBLIC_LIMIT);
      const existing = new Set(rows.map((r) => r.targetId));
      const extras = overrides
        .filter((o) => !existing.has(o.targetId))
        .map<AggregatedRankingRow>((o) => ({ targetId: o.targetId, total: 0 }));
      const merged = [...rows, ...extras].slice(0, PUBLIC_LIMIT);
      return this.enrich(kind, merged);
    }
    return this.enrich(kind, rows);
  }

  private async getLatestGeneratedAt(): Promise<Date | null> {
    const dates = await Promise.all(
      ALL_KINDS.map((k) => rankingRepository.latestPeriodEnd(k))
    );
    const valid = dates.filter((d): d is Date => d !== null);
    if (valid.length === 0) return null;
    return new Date(Math.max(...valid.map((d) => d.getTime())));
  }

  private async enrich(
    kind: RankingKind,
    rows: AggregatedRankingRow[]
  ): Promise<RankingItem[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.targetId);
    switch (kind) {
      case RankingKind.TAROTIST: {
        const entities = await prisma.tarotist.findMany({
          where: { id: { in: ids }, deletedAt: null },
          select: { id: true, name: true, icon: true, avatarUrl: true },
        });
        const map = new Map(entities.map((e) => [e.id, e]));
        return rows
          .filter((r) => map.has(r.targetId))
          .map((r, i) => {
            const e = map.get(r.targetId)!;
            return {
              rank: i + 1,
              id: e.id,
              name: e.name,
              count: r.total,
              icon: e.icon,
              avatarUrl: e.avatarUrl ?? null,
            };
          });
      }
      case RankingKind.SPREAD: {
        const entities = await prisma.spread.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, _count: { select: { cells: true } } },
        });
        const map = new Map(entities.map((e) => [e.id, e]));
        return rows
          .filter((r) => map.has(r.targetId))
          .map((r, i) => {
            const e = map.get(r.targetId)!;
            return {
              rank: i + 1,
              id: e.id,
              name: e.name,
              count: r.total,
              cardCount: e._count.cells,
            };
          });
      }
      case RankingKind.CATEGORY:
      case RankingKind.PERSONAL_CATEGORY: {
        const entities = await prisma.readingCategory.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        });
        const map = new Map(entities.map((e) => [e.id, e]));
        return rows
          .filter((r) => map.has(r.targetId))
          .map((r, i) => {
            const e = map.get(r.targetId)!;
            return { rank: i + 1, id: e.id, name: e.name, count: r.total };
          });
      }
      case RankingKind.CARD: {
        const entities = await prisma.tarotCard.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, code: true },
        });
        const map = new Map(entities.map((e) => [e.id, e]));
        return rows
          .filter((r) => map.has(r.targetId))
          .map((r, i) => {
            const e = map.get(r.targetId)!;
            return {
              rank: i + 1,
              id: e.id,
              name: e.name,
              count: r.total,
              cardCode: e.code,
            };
          });
      }
    }
  }

  // -------- Cron: 1 バケット集計 --------

  /**
   * 指定 periodStart のバケット（+ 1時間）を集計して全種別を upsert。
   * periodStart を省略した場合「直前の時間境界」を採用（例: 10:37 実行 → 09:00-10:00 バケット）
   */
  async aggregateBucket(
    periodStart?: Date
  ): Promise<{ periodStart: string; periodEnd: string; kinds: { kind: RankingKind; count: number }[] }> {
    const start = periodStart ?? new Date(truncateToHour(new Date()).getTime() - BUCKET_MS);
    const end = new Date(start.getTime() + BUCKET_MS);
    const generatedAt = new Date();

    const results = await Promise.all(
      ALL_KINDS.map(async (kind) => {
        const entries = await rankingRepository.aggregateBucket(kind, start, end);
        await rankingRepository.upsertBucket(kind, start, end, entries, generatedAt);
        return { kind, count: entries.length };
      })
    );

    return {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      kinds: results,
    };
  }

  // -------- Admin: 期間オペ --------

  /** 期間指定バケット削除 */
  async deleteBuckets(from: Date, to: Date, kind?: RankingKind) {
    return rankingRepository.deleteBucketsInRange(from, to, kind);
  }

  /** 期間指定再収集: [from, to) の 1時間刻みバケットを全て集計し直す */
  async refreshBuckets(from: Date, to: Date): Promise<number> {
    const start = truncateToHour(from);
    const end = truncateToHour(to);
    let processed = 0;
    for (let t = start.getTime(); t < end.getTime(); t += BUCKET_MS) {
      await this.aggregateBucket(new Date(t));
      processed++;
    }
    return processed;
  }

  /** バックフィル: [from, to) の中で欠損しているバケットだけ集計 */
  async backfill(from: Date, to: Date): Promise<{ filled: number; skipped: number }> {
    const start = truncateToHour(from);
    const end = truncateToHour(to);
    let filled = 0;
    let skipped = 0;
    // kind ごとに存在バケットを取得して差分を確認
    const existingByKind = new Map<RankingKind, Set<number>>();
    for (const kind of ALL_KINDS) {
      const starts = await rankingRepository.listBucketStartsInRange(kind, start, end);
      existingByKind.set(kind, new Set(starts.map((d) => d.getTime())));
    }
    for (let t = start.getTime(); t < end.getTime(); t += BUCKET_MS) {
      // どの kind も揃っていれば skip（= 全 kind で存在するバケットはスキップ）
      const missing = ALL_KINDS.some(
        (kind) => !(existingByKind.get(kind) ?? new Set()).has(t)
      );
      if (!missing) {
        skipped++;
        continue;
      }
      await this.aggregateBucket(new Date(t));
      filled++;
    }
    return { filled, skipped };
  }

  /** 種別リセット（全バケット削除） */
  async resetKind(kind: RankingKind) {
    return rankingRepository.deleteAllByKind(kind);
  }

  // -------- Admin: 状態表示 --------

  async getAdminSummary() {
    const from = new Date(Date.now() - 24 * BUCKET_MS * 7); // 直近7日
    const result = await Promise.all(
      ALL_KINDS.map(async (kind) => {
        const bucketStarts = await rankingRepository.listBucketStartsInRange(
          kind,
          from,
          new Date()
        );
        const latest = await rankingRepository.latestPeriodEnd(kind);
        return {
          kind,
          latestPeriodEnd: latest,
          bucketCount7d: bucketStarts.length,
          bucketStarts7d: bucketStarts,
        };
      })
    );
    return result;
  }

  // -------- Admin: Override passthrough --------

  listOverrides(kind?: RankingKind) {
    return rankingRepository.listOverrides(kind);
  }

  upsertOverride(input: {
    kind: RankingKind;
    targetId: string;
    rank: number;
    isActive: boolean;
    note?: string | null;
    updatedBy?: string | null;
  }) {
    return rankingRepository.upsertOverride(input);
  }

  deleteOverride(id: string) {
    return rankingRepository.deleteOverride(id);
  }
}

export const rankingService = new RankingService();
