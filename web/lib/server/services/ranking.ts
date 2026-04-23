import { prisma } from "@/lib/server/repositories/database";
import {
  RankingKind,
  rankingRepository,
  type RankingEntry,
} from "@/lib/server/repositories/ranking";
import {
  FeatureFlagKeys,
  featureFlagService,
} from "@/lib/server/services/feature-flag";

export { RankingKind };

const RANKING_PERIOD_DAYS = 30;
const PUBLIC_LIMIT = 10;
const AGG_LIMIT = 50; // Snapshot 保存時の最大件数
const FALLBACK_THRESHOLD = 3; // Snapshot がこれ未満のとき Override で埋める

export type RankingItem = {
  rank: number;
  id: string;
  name: string;
  count: number;
  // 種別固有メタデータ
  icon?: string | null;
  avatarUrl?: string | null;
  cardCount?: number;
  cardCode?: string; // TarotCard のコード（画像パス解決に使う）
};

export type RankingResponse = {
  tarotists: RankingItem[] | null;
  spreads: RankingItem[] | null;
  categories: RankingItem[] | null;
  cards: RankingItem[] | null;
  personalCategories: RankingItem[] | null;
  generatedAt: string | null; // ISO 8601
  periodDays: number;
};

export class RankingService {
  /** 公開ページ用：5種のランキングをまとめて取得 */
  async getPublicRanking(): Promise<RankingResponse> {
    const [
      tarotistEnabled,
      spreadEnabled,
      categoryEnabled,
      cardEnabled,
      personalCategoryEnabled,
    ] = await Promise.all([
      featureFlagService.isEnabled(FeatureFlagKeys.RANKING_TAROTIST_ENABLED),
      featureFlagService.isEnabled(FeatureFlagKeys.RANKING_SPREAD_ENABLED),
      featureFlagService.isEnabled(FeatureFlagKeys.RANKING_CATEGORY_ENABLED),
      featureFlagService.isEnabled(FeatureFlagKeys.RANKING_CARD_ENABLED),
      featureFlagService.isEnabled(FeatureFlagKeys.RANKING_PERSONAL_CATEGORY_ENABLED),
    ]);

    const [tarotists, spreads, categories, cards, personalCategories, latest] =
      await Promise.all([
        tarotistEnabled ? this.getList(RankingKind.TAROTIST) : Promise.resolve(null),
        spreadEnabled ? this.getList(RankingKind.SPREAD) : Promise.resolve(null),
        categoryEnabled ? this.getList(RankingKind.CATEGORY) : Promise.resolve(null),
        cardEnabled ? this.getList(RankingKind.CARD) : Promise.resolve(null),
        personalCategoryEnabled
          ? this.getList(RankingKind.PERSONAL_CATEGORY)
          : Promise.resolve(null),
        this.getLatestGeneratedAt(),
      ]);

    return {
      tarotists,
      spreads,
      categories,
      cards,
      personalCategories,
      generatedAt: latest?.toISOString() ?? null,
      periodDays: RANKING_PERIOD_DAYS,
    };
  }

  private async getLatestGeneratedAt(): Promise<Date | null> {
    const kinds: RankingKind[] = [
      RankingKind.TAROTIST,
      RankingKind.SPREAD,
      RankingKind.CATEGORY,
      RankingKind.CARD,
      RankingKind.PERSONAL_CATEGORY,
    ];
    const dates = await Promise.all(
      kinds.map((k) => rankingRepository.getLatestGeneratedAt(k))
    );
    const valid = dates.filter((d): d is Date => d !== null);
    if (valid.length === 0) return null;
    return new Date(Math.max(...valid.map((d) => d.getTime())));
  }

  /** 1種別のランキング構築：Snapshot 優先、しきい値未満なら Override で埋める */
  private async getList(kind: RankingKind): Promise<RankingItem[]> {
    const snapshot = await rankingRepository.getLatestSnapshot(kind, PUBLIC_LIMIT);
    let entries: RankingEntry[] = snapshot;

    if (entries.length < FALLBACK_THRESHOLD) {
      const overrides = await rankingRepository.getActiveOverrides(kind, PUBLIC_LIMIT);
      // 既存 Snapshot の targetId を避けつつ、Override を後ろに連結
      const existingIds = new Set(entries.map((e) => e.targetId));
      const extraEntries = overrides
        .filter((o) => !existingIds.has(o.targetId))
        .map((o, i) => ({
          targetId: o.targetId,
          count: 0,
          rank: entries.length + i + 1,
        }));
      entries = [...entries, ...extraEntries].slice(0, PUBLIC_LIMIT);
    }

    if (entries.length === 0) return [];
    return this.enrichEntries(kind, entries);
  }

  /** targetId を実体（名前・アイコン等）に解決する */
  private async enrichEntries(
    kind: RankingKind,
    entries: RankingEntry[]
  ): Promise<RankingItem[]> {
    const ids = entries.map((e) => e.targetId);
    switch (kind) {
      case RankingKind.TAROTIST: {
        const rows = await prisma.tarotist.findMany({
          where: { id: { in: ids }, deletedAt: null },
          select: { id: true, name: true, icon: true, avatarUrl: true },
        });
        const map = new Map(rows.map((r) => [r.id, r]));
        return entries
          .filter((e) => map.has(e.targetId))
          .map((e) => {
            const r = map.get(e.targetId)!;
            return {
              rank: e.rank,
              id: r.id,
              name: r.name,
              count: e.count,
              icon: r.icon,
              avatarUrl: r.avatarUrl ?? null,
            };
          });
      }
      case RankingKind.SPREAD: {
        const rows = await prisma.spread.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, _count: { select: { cells: true } } },
        });
        const map = new Map(rows.map((r) => [r.id, r]));
        return entries
          .filter((e) => map.has(e.targetId))
          .map((e) => {
            const r = map.get(e.targetId)!;
            return {
              rank: e.rank,
              id: r.id,
              name: r.name,
              count: e.count,
              cardCount: r._count.cells,
            };
          });
      }
      case RankingKind.CATEGORY:
      case RankingKind.PERSONAL_CATEGORY: {
        const rows = await prisma.readingCategory.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        });
        const map = new Map(rows.map((r) => [r.id, r]));
        return entries
          .filter((e) => map.has(e.targetId))
          .map((e) => {
            const r = map.get(e.targetId)!;
            return { rank: e.rank, id: r.id, name: r.name, count: e.count };
          });
      }
      case RankingKind.CARD: {
        const rows = await prisma.tarotCard.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, code: true },
        });
        const map = new Map(rows.map((r) => [r.id, r]));
        return entries
          .filter((e) => map.has(e.targetId))
          .map((e) => {
            const r = map.get(e.targetId)!;
            return {
              rank: e.rank,
              id: r.id,
              name: r.name,
              count: e.count,
              cardCode: r.code,
            };
          });
      }
    }
  }

  // -------- Cron: 全種別を洗い替え --------

  async refreshAllSnapshots(): Promise<{
    kinds: { kind: RankingKind; count: number }[];
    generatedAt: string;
  }> {
    const generatedAt = new Date();
    const results = await Promise.all([
      this.refreshOne(RankingKind.TAROTIST, generatedAt),
      this.refreshOne(RankingKind.SPREAD, generatedAt),
      this.refreshOne(RankingKind.CATEGORY, generatedAt),
      this.refreshOne(RankingKind.CARD, generatedAt),
      this.refreshOne(RankingKind.PERSONAL_CATEGORY, generatedAt),
    ]);
    return {
      kinds: results,
      generatedAt: generatedAt.toISOString(),
    };
  }

  private async refreshOne(
    kind: RankingKind,
    generatedAt: Date
  ): Promise<{ kind: RankingKind; count: number }> {
    const entries = await this.aggregate(kind);
    await rankingRepository.replaceSnapshot(kind, entries, generatedAt);
    return { kind, count: entries.length };
  }

  private async aggregate(kind: RankingKind): Promise<RankingEntry[]> {
    switch (kind) {
      case RankingKind.TAROTIST:
        return rankingRepository.aggregateTarotist(RANKING_PERIOD_DAYS, AGG_LIMIT);
      case RankingKind.SPREAD:
        return rankingRepository.aggregateSpread(RANKING_PERIOD_DAYS, AGG_LIMIT);
      case RankingKind.CATEGORY:
        return rankingRepository.aggregateCategory(RANKING_PERIOD_DAYS, AGG_LIMIT);
      case RankingKind.CARD:
        return rankingRepository.aggregateCard(RANKING_PERIOD_DAYS, AGG_LIMIT);
      case RankingKind.PERSONAL_CATEGORY:
        return rankingRepository.aggregatePersonalCategory(
          RANKING_PERIOD_DAYS,
          AGG_LIMIT
        );
    }
  }

  // -------- Admin: Override 管理 --------

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

  // -------- Admin: Snapshot 情報 --------

  async getSnapshotSummary() {
    const kinds: RankingKind[] = [
      RankingKind.TAROTIST,
      RankingKind.SPREAD,
      RankingKind.CATEGORY,
      RankingKind.CARD,
      RankingKind.PERSONAL_CATEGORY,
    ];
    return Promise.all(
      kinds.map(async (kind) => {
        const latest = await rankingRepository.getLatestGeneratedAt(kind);
        const entries = latest
          ? await rankingRepository.getLatestSnapshot(kind, PUBLIC_LIMIT)
          : [];
        return { kind, generatedAt: latest, entries };
      })
    );
  }
}

export const rankingService = new RankingService();
