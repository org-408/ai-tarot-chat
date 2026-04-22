import { BookOpen, History, Sparkles, Star, Zap } from "lucide-react";
import { useEffect } from "react";
import type {
  AppJWTPayload,
  MasterData,
  Plan,
  Reading,
  UsageStats,
} from "../../../shared/lib/types";
import { useClient } from "../lib/hooks/use-client";
import type { UserPlan } from "../types";
import UpgradeGuide from "./upgrade-guide";

interface HomePageProps {
  payload: AppJWTPayload;
  currentPlan: Plan;
  masterData: MasterData;
  usageStats: UsageStats;
  onNavigateToSalon: () => void;
  onNavigateToPersonal: () => void;
  onNavigateToClara: () => void;
  onNavigateToTarotist: () => void;
  onNavigateToHistory: () => void;
  onNavigateToReading: (reading: Reading) => void;
  onChangePlan: (plan: UserPlan) => void;
  isChangingPlan: boolean;
}

const HomePage: React.FC<HomePageProps> = ({
  payload,
  currentPlan,
  usageStats,
  onNavigateToSalon,
  onNavigateToPersonal,
  onNavigateToClara,
  onNavigateToTarotist,
  onNavigateToHistory,
  onChangePlan,
  isChangingPlan,
}) => {
  const { readings, fetchReadings } = useClient();

  const canPersonal = currentPlan.hasPersonal;
  const hasHistory = currentPlan.hasHistory;
  const isPremium = currentPlan.code === "PREMIUM";
  const user = payload.user ?? null;

  const remainingQuick = usageStats.remainingReadings;
  const remainingPersonal = usageStats.remainingPersonal;
  const maxQuick = currentPlan.maxReadings;
  const maxPersonal = currentPlan.maxPersonal;

  useEffect(() => {
    if (hasHistory) {
      fetchReadings({ take: 5, skip: 0 });
    }
  }, [hasHistory, fetchReadings]);

  const todayLabel = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const greeting = user?.name
    ? `おかえりなさい、${user.name}さん`
    : user?.email
      ? `おかえりなさい`
      : "ようこそ";

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
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {greeting}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{todayLabel}</p>
        </div>

        {/* 今日の残り */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            今日の残り
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {/* クイック */}
            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-700">
                  クイック占い
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-purple-700">
                  {remainingQuick}
                </span>
                <span className="text-sm text-gray-400">/ {maxQuick} 回</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                毎日 0 時にリセット
              </p>
            </div>

            {/* パーソナル */}
            <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-pink-600" />
                <span className="text-xs font-medium text-pink-700">
                  パーソナル占い
                </span>
              </div>
              {canPersonal && maxPersonal > 0 ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-pink-700">
                    {remainingPersonal}
                  </span>
                  <span className="text-sm text-gray-400">
                    / {maxPersonal} 回
                  </span>
                </div>
              ) : (
                <div className="text-xs text-gray-500">プレミアム限定</div>
              )}
              <p className="text-[10px] text-gray-400 mt-1">
                {canPersonal && maxPersonal > 0
                  ? "毎日 0 時にリセット"
                  : "プレミアムへアップグレード"}
              </p>
            </div>
          </div>
        </section>

        {/* プライマリ CTA: クイック占い */}
        <button
          type="button"
          onClick={onNavigateToSalon}
          className="w-full rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-5 shadow-md active:opacity-80 flex items-center gap-4 transition-opacity"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-bold text-base">クイック占いを始める</div>
            <p className="text-xs opacity-90 mt-0.5">
              占い師・ジャンル・スプレッドを選んで占う
            </p>
          </div>
          <span className="text-xl">→</span>
        </button>

        {/* セカンダリ CTA: パーソナル占い */}
        <button
          type="button"
          onClick={canPersonal ? onNavigateToPersonal : () => onChangePlan("PREMIUM")}
          disabled={isChangingPlan}
          className="w-full rounded-2xl bg-white border border-pink-100 p-4 active:bg-pink-50 flex items-center gap-3 transition-colors disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-pink-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-gray-900 text-sm">
              パーソナル占い
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {canPersonal
                ? "AI と対話しながらじっくり占う"
                : "プレミアムへアップグレード"}
            </p>
          </div>
          <span className="text-pink-600 font-semibold text-sm">→</span>
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
            <div className="font-semibold text-gray-900 text-sm">
              占い師を見る
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              タロティストのプロフィールを確認
            </p>
          </div>
          <span className="text-amber-600 font-semibold text-sm">→</span>
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
            <div className="font-semibold text-gray-900 text-sm">
              いつでも占い
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Clara とオフラインで占う
            </p>
          </div>
          <span className="text-sky-600 font-semibold text-sm">→</span>
        </button>

        {/* 最近の占い */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-700 text-sm">
                最近の占い
              </h3>
            </div>
            {hasHistory && readings.length > 0 && (
              <button
                type="button"
                onClick={onNavigateToHistory}
                className="text-xs text-purple-600 active:underline"
              >
                すべて見る
              </button>
            )}
          </div>

          {!hasHistory ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-4 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500">
                会員登録すると占いの履歴が保存されます
              </p>
              <button
                type="button"
                onClick={() => onChangePlan("FREE")}
                className="shrink-0 text-xs font-semibold text-purple-600 active:underline"
              >
                登録 →
              </button>
            </div>
          ) : readings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center">
              <p className="text-xs text-gray-500">
                まだ占いの履歴がありません
              </p>
            </div>
          ) : (
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: "none" }}
            >
              {readings.slice(0, 5).map((r: Reading) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onNavigateToReading(r)}
                  className="flex-shrink-0 w-36 bg-white rounded-xl border p-3 active:bg-gray-50 text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-purple-100">
                      <img
                        src={`/tarotists/${r.tarotist?.name}.png`}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 truncate">
                      {r.tarotist?.name ?? "?"}
                    </span>
                  </div>
                  {r.category == null && (
                    <span className="text-[10px] bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full">
                      パーソナル
                    </span>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(r.createdAt).toLocaleDateString("ja-JP", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* アップグレード誘導（非 PREMIUM 時） */}
        {!isPremium && (
          <section className="pt-2">
            <UpgradeGuide
              handleChangePlan={onChangePlan}
              isChangingPlan={isChangingPlan}
            />
          </section>
        )}
      </div>
    </div>
  );
};

export default HomePage;
