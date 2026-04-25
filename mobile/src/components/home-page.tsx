import { BookOpen, History, Sparkles, Star, Zap } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type {
  AppJWTPayload,
  MasterData,
  Plan,
  Reading,
  UsageStats,
} from "../../../shared/lib/types";
import { useClient } from "../lib/hooks/use-client";
import { useMaster } from "../lib/hooks/use-master";
import type { UserPlan } from "../types";
import UpgradeGuide from "./upgrade-guide";

interface HomePageProps {
  payload: AppJWTPayload;
  currentPlan: Plan;
  masterData: MasterData;
  usageStats: UsageStats;
  onNavigateToQuick: () => void;
  onNavigateToPersonal: () => void;
  onNavigateToClara: () => void;
  onNavigateToTarotist: () => void;
  onNavigateToHistory: () => void;
  onNavigateToReading: (reading: Reading) => void;
  onChangePlan: (
    plan: UserPlan,
    options?: { onSuccess?: "history" | "personal" | "stay" | "portrait" },
  ) => void;
  isChangingPlan: boolean;
}

const HomePage: React.FC<HomePageProps> = ({
  payload,
  currentPlan,
  usageStats,
  onNavigateToQuick,
  onNavigateToPersonal,
  onNavigateToClara,
  onNavigateToTarotist,
  onNavigateToHistory,
  onNavigateToReading,
  onChangePlan,
  isChangingPlan,
}) => {
  const { t, i18n } = useTranslation();
  const { readings, fetchReadings } = useClient();

  const canPersonal = currentPlan.hasPersonal;
  const hasHistory = currentPlan.hasHistory;
  const isPremium = currentPlan.code === "PREMIUM";
  const user = payload.user ?? null;

  const remainingQuick = usageStats.remainingReadings;
  const remainingPersonal = usageStats.remainingPersonal;
  const maxQuick = currentPlan.maxReadings;
  const maxPersonal = currentPlan.maxPersonal;
  // 履歴カードに表示する spread / category は保存時点の言語版なので現在言語に解決する
  const { spreadById, categoryById } = useMaster();

  useEffect(() => {
    if (hasHistory) {
      fetchReadings({ take: 5, skip: 0 });
    }
  }, [hasHistory, fetchReadings]);

  const dateLocale = i18n.language === "ja" ? "ja-JP" : "en-US";
  const todayLabel = new Date().toLocaleDateString(dateLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const greeting = user?.name
    ? t("home.welcomeNamed", { name: user.name })
    : user?.email
      ? t("home.welcomeBack")
      : t("home.welcome");

  return (
    <div
      className="fixed left-0 right-0 overflow-y-auto"
      style={{
        top: "calc(50px + env(safe-area-inset-top))",
        bottom: 0,
      }}
    >
      <div className="px-4 pt-4 pb-20 space-y-5 max-w-xl mx-auto">
        {/* 挨拶 */}
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {greeting}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{todayLabel}</p>
        </div>

        {/* 今日の残り */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-2">
            {t("home.todayRemaining")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {/* クイック */}
            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">
                  {t("home.quickReading")}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-purple-700">
                  {remainingQuick}
                </span>
                <span className="text-base text-gray-400">
                  {t("home.perCount", { count: maxQuick })}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {t("home.dailyReset")}
              </p>
            </div>

            {/* パーソナル */}
            <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-pink-600" />
                <span className="text-sm font-medium text-pink-700">
                  {t("home.dialogueReading")}
                </span>
              </div>
              {canPersonal && maxPersonal > 0 ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-pink-700">
                    {remainingPersonal}
                  </span>
                  <span className="text-base text-gray-400">
                    {t("home.perCount", { count: maxPersonal })}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  {t("home.premiumOnly")}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {canPersonal && maxPersonal > 0
                  ? t("home.dailyReset")
                  : t("home.upgradeToPremium")}
              </p>
            </div>
          </div>
        </section>

        {/* プライマリ CTA: クイック占い */}
        <button
          type="button"
          onClick={onNavigateToQuick}
          className="w-full rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-5 shadow-md active:opacity-80 flex items-center gap-4 transition-opacity"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-bold text-lg">{t("home.startQuick")}</div>
            <p className="text-sm opacity-90 mt-0.5">{t("home.quickDesc")}</p>
          </div>
          <span className="text-xl">→</span>
        </button>

        {/* セカンダリ CTA: パーソナル占い */}
        <button
          type="button"
          onClick={
            canPersonal
              ? onNavigateToPersonal
              : // PREMIUM のデフォルト遷移先が personal なので明示は不要だが、
                // 意図を明確にするため onSuccess: "personal" を渡す。
                () => onChangePlan("PREMIUM", { onSuccess: "personal" })
          }
          disabled={isChangingPlan}
          className="w-full rounded-2xl bg-white border border-pink-100 p-4 active:bg-pink-50 flex items-center gap-3 transition-colors disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-pink-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-gray-900 text-base">
              {t("home.dialogueReading")}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {canPersonal
                ? t("home.dialogueDesc")
                : t("home.upgradeToPremium")}
            </p>
          </div>
          <span className="text-pink-600 font-semibold text-base">→</span>
        </button>

        {/* 占い師を見る */}
        <button
          type="button"
          onClick={onNavigateToTarotist}
          className="w-full rounded-2xl bg-white border border-amber-100 p-4 active:bg-amber-50 flex items-center gap-3 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-gray-900 text-base">
              {t("home.viewPersonas")}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {t("home.viewPersonasDesc")}
            </p>
          </div>
          <span className="text-amber-600 font-semibold text-base">→</span>
        </button>

        {/* いつでも占い（Clara） */}
        <button
          type="button"
          onClick={onNavigateToClara}
          className="w-full rounded-2xl bg-white border border-sky-100 p-4 active:bg-sky-50 flex items-center gap-3 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-sky-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-gray-900 text-base">
              {t("home.offlineReading")}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {t("home.offlineDesc")}
            </p>
          </div>
          <span className="text-sky-600 font-semibold text-base">→</span>
        </button>

        {/* 最近の占い */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-700 text-base">
                {t("home.recentSessions")}
              </h3>
            </div>
            {hasHistory && readings.length > 0 && (
              <button
                type="button"
                onClick={onNavigateToHistory}
                className="text-sm text-purple-600 active:underline"
              >
                {t("home.viewAll")}
              </button>
            )}
          </div>

          {!hasHistory ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-4 flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                {t("home.historySavedGuest")}
              </p>
              <button
                type="button"
                onClick={() => onChangePlan("FREE")}
                className="shrink-0 text-sm font-semibold text-purple-600 active:underline"
              >
                {t("home.register")}
              </button>
            </div>
          ) : readings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center">
              <p className="text-sm text-gray-500">{t("home.noHistory")}</p>
            </div>
          ) : (
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {readings.slice(0, 5).map((r: Reading) => {
                const isPersonal = r.mode === "PERSONAL";
                // 保存時点と UI 現在言語が異なる場合に備え、id から現在言語版を引き直す
                const resolvedCategory = r.categoryId
                  ? categoryById.get(r.categoryId) ?? r.category
                  : r.category;
                const resolvedSpread = r.spreadId
                  ? spreadById.get(r.spreadId) ?? r.spread
                  : r.spread;
                const mainText = isPersonal
                  ? r.customQuestion
                  : resolvedCategory?.name;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onNavigateToReading(r)}
                    className="flex-shrink-0 w-48 bg-white rounded-xl border p-3 active:bg-gray-50 text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-purple-100">
                        <img
                          src={`/tarotists/${r.tarotist?.name}.png`}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none";
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {r.tarotist?.name ?? "?"}
                      </span>
                    </div>
                    {mainText && (
                      <p className="text-sm font-medium text-gray-800 truncate leading-tight">
                        {mainText}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {resolvedSpread?.name && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {resolvedSpread.name}
                        </span>
                      )}
                      {isPersonal && (
                        <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                          {t("home.personalTag")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-end mt-1.5">
                      <span className="text-xs text-gray-400">
                        {new Date(r.createdAt).toLocaleDateString(dateLocale, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* アップグレード誘導（非 PREMIUM 時） */}
        {/*
          ホーム最下部の UpgradeGuide は閲覧目的で置かれているため、
          成功時もキャンセル・失敗時もホームに留まる仕様。
          FREE/STANDARD/PREMIUM いずれを選んでも遷移しないよう stay を強制。
          詳細: docs/plan-change-navigation-spec.md 2-2 c / .claude/rules/plan-change-navigation.md
        */}
        {!isPremium && (
          <section className="pt-2">
            <UpgradeGuide
              handleChangePlan={(plan) =>
                onChangePlan(plan, { onSuccess: "stay" })
              }
              isChangingPlan={isChangingPlan}
            />
          </section>
        )}
      </div>
    </div>
  );
};

export default HomePage;
