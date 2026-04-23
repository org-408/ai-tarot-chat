import { featureFlagRepository } from "@/lib/server/repositories/feature-flag";

/** 既知の Feature Flag キー（タイプセーフティのため定数化） */
export const FeatureFlagKeys = {
  RANKING_ENABLED: "ranking.enabled",
  RANKING_TAROTIST_ENABLED: "ranking.tarotist.enabled",
  RANKING_SPREAD_ENABLED: "ranking.spread.enabled",
  RANKING_CATEGORY_ENABLED: "ranking.category.enabled",
  RANKING_CARD_ENABLED: "ranking.card.enabled",
  RANKING_PERSONAL_CATEGORY_ENABLED: "ranking.personalCategory.enabled",
} as const;

export type FeatureFlagKey = (typeof FeatureFlagKeys)[keyof typeof FeatureFlagKeys];

/** 既定値 — DB に未登録の場合に採用される。すべて false（= 未リリース） */
export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagKey, { enabled: boolean; description: string }> = {
  [FeatureFlagKeys.RANKING_ENABLED]: {
    enabled: false,
    description: "公開 /ranking ページと /api/ranking を有効化する",
  },
  [FeatureFlagKeys.RANKING_TAROTIST_ENABLED]: {
    enabled: true,
    description: "占い師ランキングを表示する",
  },
  [FeatureFlagKeys.RANKING_SPREAD_ENABLED]: {
    enabled: true,
    description: "スプレッドランキングを表示する",
  },
  [FeatureFlagKeys.RANKING_CATEGORY_ENABLED]: {
    enabled: true,
    description: "ジャンルランキング（全体）を表示する",
  },
  [FeatureFlagKeys.RANKING_CARD_ENABLED]: {
    enabled: true,
    description: "引かれたカードランキングを表示する",
  },
  [FeatureFlagKeys.RANKING_PERSONAL_CATEGORY_ENABLED]: {
    enabled: true,
    description: "パーソナル占いのテーマランキングを表示する",
  },
};

export class FeatureFlagService {
  async isEnabled(key: FeatureFlagKey): Promise<boolean> {
    const flag = await featureFlagRepository.get(key);
    if (flag) return flag.enabled;
    return FEATURE_FLAG_DEFAULTS[key]?.enabled ?? false;
  }

  async list() {
    const records = await featureFlagRepository.list();
    const map = new Map(records.map((r) => [r.key, r]));
    // 既知キーはデフォルトとマージ、未知キーはそのまま返す
    const known = (Object.keys(FEATURE_FLAG_DEFAULTS) as FeatureFlagKey[]).map((key) => {
      const record = map.get(key);
      return {
        key,
        enabled: record?.enabled ?? FEATURE_FLAG_DEFAULTS[key].enabled,
        description: record?.description ?? FEATURE_FLAG_DEFAULTS[key].description,
        updatedBy: record?.updatedBy ?? null,
        updatedAt: record?.updatedAt ?? null,
        persisted: record !== undefined,
      };
    });
    const unknownRecords = records.filter(
      (r) => !(r.key in FEATURE_FLAG_DEFAULTS)
    );
    const unknown = unknownRecords.map((r) => ({
      key: r.key,
      enabled: r.enabled,
      description: r.description ?? "",
      updatedBy: r.updatedBy,
      updatedAt: r.updatedAt,
      persisted: true,
    }));
    return [...known, ...unknown];
  }

  async setEnabled(key: string, enabled: boolean, updatedBy: string | null) {
    const description =
      key in FEATURE_FLAG_DEFAULTS
        ? FEATURE_FLAG_DEFAULTS[key as FeatureFlagKey].description
        : null;
    return featureFlagRepository.upsert(key, enabled, {
      description,
      updatedBy,
    });
  }
}

export const featureFlagService = new FeatureFlagService();
