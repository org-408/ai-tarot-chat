import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AppJWTPayload,
  MasterData,
  Plan,
  Tarotist,
} from "../../../shared/lib/types";
import {
  canUseTarotist,
  getPlanColors,
  getTarotistColor,
  renderStars,
} from "../lib/utils/salon";
import { useMaster } from "../lib/hooks/use-master";
import { getPlanBadgeLabel, getPlanDisplayName } from "../lib/utils/plan-display";
import type { UserPlan } from "../types";
import { TarotistInfoDialog } from "../../../shared/components/tarotist/tarotist-info-dialog";

interface TarotistPageProps {
  payload: AppJWTPayload;
  currentPlan: Plan;
  masterData: MasterData;
  onChangePlan: (
    plan: UserPlan,
    options?: { onSuccess?: "history" | "personal" | "stay" | "portrait" },
  ) => void;
  isChangingPlan: boolean;
  onNavigateToClara?: () => void;
}

const TarotistPage: React.FC<TarotistPageProps> = ({
  payload,
  currentPlan,
  masterData: _masterData,
  onChangePlan,
  isChangingPlan,
  onNavigateToClara: _onNavigateToClara,
}) => {
  const { t } = useTranslation();
  // 現在言語に解決済みのマスターデータを使用 (prop masterData は raw)
  const { tarotists: availableTarotistsAll, plans } = useMaster();
  const [selectedTarotist, setSelectedTarotist] = useState<Tarotist | null>(
    null
  );
  const availableTarotists = availableTarotistsAll || [];


  const handleChangePlan = (requiredPlan: string) => {
    // サイドバーの占い師一覧は閲覧用途。成功時も現在地維持。
    // 詳細: docs/plan-change-navigation-spec.md 2-3 / .claude/rules/plan-change-navigation.md
    onChangePlan(requiredPlan as UserPlan, { onSuccess: "stay" });
  };

  const currentColors = currentPlan
    ? getPlanColors(currentPlan.code, plans)
    : getPlanColors("GUEST", plans);

  return (
    <div className="main-container">
      {/* ヘッダー */}
      <div className="page-title pt-3">{t("tarotist.pageTitle")}</div>

      {/* 現在の状態表示 */}
      <div
        className="mb-6 p-4 rounded-lg text-center border-2"
        style={{
          backgroundColor: currentColors.primary,
          borderColor: currentColors.secondary,
        }}
      >
        <div className="text-sm text-gray-600">{t("plans.currentPlan")}</div>
        <div
          className="font-bold text-lg"
          style={{ color: currentColors.accent }}
        >
          {getPlanDisplayName(currentPlan.code, t, currentPlan.name)}
        </div>
        {!payload.user && (
          <div className="text-xs text-orange-600 mt-1">
            {t("auth.unauthenticatedNotice")}
          </div>
        )}
      </div>

      {/* 占い師カード一覧 */}
      <div className="space-y-4">
        {availableTarotists
          ?.sort((a, b) => (a.no || 0) - (b.no || 0))
          .map((tarotist) => {
            const isAvailable = canUseTarotist(tarotist.plan!, currentPlan);
            const requiresUpgrade = !isAvailable;
            const colors = getTarotistColor(tarotist);

            return (
              <div
                key={tarotist.name}
                className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  isAvailable ? "hover:shadow-md" : "opacity-80"
                }`}
                style={{
                  backgroundColor: colors.bg,
                  borderColor: colors.secondary,
                }}
                onClick={() => setSelectedTarotist(tarotist)}
              >
                {/* プランバッジ */}
                <div
                  className="absolute -top-2 right-4 text-white text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: tarotist.plan!.accentColor }}
                >
                  {tarotist.provider === "OFFLINE"
                    ? t("tarotist.offline")
                    : getPlanBadgeLabel(tarotist.plan!.code, t, tarotist.plan!.name)}
                </div>

                <div className="flex gap-4">
                  {/* 占い師画像 */}
                  <div className="flex-shrink-0">
                    <img
                      src={`/tarotists/${tarotist.name}.png`}
                      alt={tarotist.title}
                      className={`w-24 h-24 rounded-lg object-cover ${
                        !isAvailable ? "opacity-50 grayscale" : ""
                      }`}
                      onError={(e) => {
                        e.currentTarget.src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='40'%3E%E2%9C%A8%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>

                  {/* 占い師情報(簡易版) */}
                  <div className="flex-1">
                    {/* 名前(筆記体で強調) */}
                    <div
                      className="font-bold text-2xl mb-1"
                      style={{
                        fontFamily: "'MonteCarlo', cursive",
                        color: colors.accent,
                      }}
                    >
                      {tarotist.icon} {tarotist.name}
                    </div>

                    {/* タイトル */}
                    <div className="text-sm text-gray-600 mb-2">
                      {tarotist.title}
                    </div>

                    {/* 特徴 */}
                    <div
                      className="text-sm font-semibold mb-2"
                      style={{ color: colors.accent }}
                    >
                      {tarotist.trait}
                    </div>

                    {/* プロフィール */}
                    <div
                      className="text-sm text-gray-700 mb-2"
                      dangerouslySetInnerHTML={{ __html: tarotist.bio ?? "" }}
                    />

                    {/* おすすめ度 */}
                    {tarotist.provider !== "OFFLINE" && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="text-sm text-gray-600">
                          {t("tarotist.recommendLevel")}
                        </div>
                        <div className="text-base">
                          {renderStars(tarotist.quality!)}
                        </div>
                      </div>
                    )}

                    {/* ステータス */}
                    {tarotist.provider !== "OFFLINE" && requiresUpgrade ? (
                      <div className="text-xs text-gray-500 text-center">
                        {t("tarotist.requiresPlan", {
                          plan: getPlanDisplayName(
                            tarotist.plan!.code,
                            t,
                            tarotist.plan!.name,
                          ),
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-green-600 font-bold text-center">
                        {tarotist.provider !== "OFFLINE"
                          ? t("tarotist.available")
                          : t("tarotist.offlineOnly")}
                      </div>
                    )}
                  </div>
                </div>

                {/* アップグレードボタン(カード下部) */}
                {tarotist.provider !== "OFFLINE" && requiresUpgrade && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChangePlan(tarotist.plan!.code);
                    }}
                    disabled={isChangingPlan}
                    className="w-full mt-3 py-2 px-4 text-white rounded-lg text-sm font-medium transition-all shadow-md"
                    style={{
                      backgroundColor: tarotist.plan!.accentColor,
                    }}
                  >
                    {isChangingPlan
                      ? t("plans.authenticating")
                      : t("plans.upgradeTo", {
                          plan: getPlanDisplayName(
                            tarotist.plan!.code,
                            t,
                            tarotist.plan!.name,
                          ),
                        })}
                  </button>
                )}
              </div>
            );
          })}
      </div>

      {/* 注意事項 */}
      <div className="mt-6 p-3 bg-purple-50 rounded-lg">
        <div className="text-xs text-purple-800">
          <div className="font-bold mb-1">{t("tarotist.noticeTitle")}</div>
          <ul className="space-y-1">
            <li>{t("tarotist.noticeModels")}</li>
            <li>{t("tarotist.noticePlans")}</li>
            <li>{t("tarotist.noticeQuality")}</li>
            <li>{t("tarotist.noticeQualityNote")}</li>
            <li>{t("tarotist.noticeTap")}</li>
          </ul>
        </div>
      </div>

      {/* プロフィールダイアログ */}
      {selectedTarotist && (
        <TarotistInfoDialog
          tarotist={selectedTarotist}
          currentPlan={currentPlan}
          onClose={() => setSelectedTarotist(null)}
          onUpgrade={(planCode) => {
            handleChangePlan(planCode);
            setSelectedTarotist(null);
          }}
          isUpgrading={isChangingPlan}
        />
      )}
    </div>
  );
};

export default TarotistPage;
