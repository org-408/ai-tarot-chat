import { useState } from "react";
import type {
  AppJWTPayload,
  MasterData,
  Plan,
  Tarotist,
} from "../../../shared/lib/types";
import type { UserPlan } from "../types";
import ProfileDialog from "./ProfileDialog";
// 新しいコンポーネントをインポート
import TarotistCarouselEmbla from "./TarotistCarouselEmbla";
import TarotistCarouselStack from "./TarotistCarouselStack";

interface TarotistSwipePageProps {
  payload: AppJWTPayload;
  masterData: MasterData;
  onChangePlan: (plan: UserPlan) => void;
  isChangingPlan: boolean;
}

const TarotistSwipePage: React.FC<TarotistSwipePageProps> = ({
  payload,
  masterData,
  onChangePlan,
  isChangingPlan,
}) => {
  const [selectedTarotist, setSelectedTarotist] = useState<Tarotist | null>(
    null
  );
  const [imageViewTarotist, setImageViewTarotist] = useState<Tarotist | null>(
    null
  );

  // カルーセルタイプの切り替え（テスト用）
  const [carouselType, setCarouselType] = useState<"embla" | "stack">("embla");

  const currentPlan = payload.planCode || "GUEST";
  const currentPlanData = masterData.plans.find(
    (p: Plan) => p.code === currentPlan
  );

  const availableTarotists =
    masterData.tarotists!.filter(
      (tarotist) => tarotist.plan!.code !== "OFFLINE"
    ) || [];

  const handleChangePlan = (requiredPlan: string) => {
    onChangePlan(requiredPlan as UserPlan);
  };

  const canUseTarotist = (requiredPlan: string) => {
    const planHierarchy: Record<string, number> = {
      GUEST: 0,
      FREE: 1,
      STANDARD: 2,
      PREMIUM: 3,
    };
    return planHierarchy[currentPlan] >= planHierarchy[requiredPlan];
  };

  const renderStars = (quality: number) => {
    return "⭐️".repeat(quality);
  };

  const getPlanColors = (planCode: string) => {
    const plan = masterData.plans.find((p: Plan) => p.code === planCode);
    if (
      !plan ||
      !plan.primaryColor ||
      !plan.secondaryColor ||
      !plan.accentColor
    ) {
      return {
        primary: "#F9FAFB",
        secondary: "#E5E7EB",
        accent: "#6B7280",
      };
    }

    return {
      primary: plan.primaryColor,
      secondary: plan.secondaryColor,
      accent: plan.accentColor,
    };
  };

  const getTarotistColor = (tarotist: Tarotist) => {
    const primary = tarotist.primaryColor;
    const secondary = tarotist.secondaryColor;
    const accent = tarotist.accentColor;

    if (primary && secondary && accent) {
      return {
        primary,
        secondary,
        accent,
        bg: primary,
        button: accent,
      };
    }

    const planColors = getPlanColors(tarotist.plan?.code || "GUEST");
    return {
      ...planColors,
      bg: planColors.primary,
      button: planColors.accent,
    };
  };

  const currentColors = currentPlanData
    ? getPlanColors(currentPlan)
    : getPlanColors("GUEST");

  return (
    <div className="main-container">
      {/* ヘッダー */}
      <div className="page-title pt-3">🔮 タロット占い師</div>

      {/* 現在の状態表示 */}
      <div
        className="mb-6 p-4 rounded-lg text-center border-2"
        style={{
          backgroundColor: currentColors.primary,
          borderColor: currentColors.secondary,
        }}
      >
        <div className="text-sm text-gray-600">現在のプラン</div>
        <div
          className="font-bold text-lg"
          style={{ color: currentColors.accent }}
        >
          {masterData.plans.find((p) => p.code === currentPlan)?.name ||
            currentPlan}
        </div>
        {!payload.user && (
          <div className="text-xs text-orange-600 mt-1">
            ⚠️ 未認証(有料プラン選択時に自動ログイン)
          </div>
        )}
      </div>

      {/* カルーセルタイプ切り替えボタン（デバッグ用） */}
      <div className="mb-4 flex gap-2 justify-center">
        <button
          onClick={() => setCarouselType("embla")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            carouselType === "embla"
              ? "bg-purple-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Embla版
        </button>
        <button
          onClick={() => setCarouselType("stack")}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            carouselType === "stack"
              ? "bg-purple-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          3D Stack版
        </button>
      </div>

      {/* カルーセル表示 */}
      {carouselType === "embla" ? (
        <TarotistCarouselEmbla
          availableTarotists={availableTarotists}
          currentPlan={currentPlan}
          canUseTarotist={canUseTarotist}
          getTarotistColor={getTarotistColor}
          renderStars={renderStars}
          onChangePlan={handleChangePlan}
          isChangingPlan={isChangingPlan}
          onSelectTarotist={setSelectedTarotist}
        />
      ) : (
        <TarotistCarouselStack
          availableTarotists={availableTarotists}
          currentPlan={currentPlan}
          canUseTarotist={canUseTarotist}
          getTarotistColor={getTarotistColor}
          renderStars={renderStars}
          onChangePlan={handleChangePlan}
          isChangingPlan={isChangingPlan}
          onSelectTarotist={setSelectedTarotist}
        />
      )}

      {/* 注意事項 */}
      <div className="mt-6 p-3 bg-purple-50 rounded-lg">
        <div className="text-xs text-purple-800">
          <div className="font-bold mb-1">📝 占い師について</div>
          <ul className="space-y-1">
            <li>• 各占い師は異なるAIモデルを使用しています</li>
            <li>• プランによって利用できる占い師が異なります</li>
            <li>• おすすめ度は各占い師の特性に基づいて独自評価したものです</li>
            <li>(感じ方には個人差がありますので体験してみてください)</li>
            <li>• 占い師をタップすると拡大したプロフィールが表示されます</li>
          </ul>
        </div>
      </div>

      {/* プロフィール拡大ダイアログ & 画像全画面表示ダイアログ */}
      <ProfileDialog
        selectedTarotist={selectedTarotist}
        setSelectedTarotist={setSelectedTarotist}
        canUseTarotist={canUseTarotist}
        handleChangePlan={handleChangePlan}
        isChangingPlan={isChangingPlan}
        setImageViewTarotist={setImageViewTarotist}
        imageViewTarotist={imageViewTarotist}
        hasButton
      />
    </div>
  );
};

export default TarotistSwipePage;
