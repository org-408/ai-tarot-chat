import type { UserPlan } from "../types";

interface AdBannerProps {
  currentPlan: UserPlan;
}

const AdBanner: React.FC<AdBannerProps> = ({ currentPlan }) => {
  // フリープラン以外は広告を表示しない
  if (currentPlan !== "FREE" && currentPlan !== "GUEST") {
    return null;
  }

  return (
    <div className="ad-banner-fixed">
      <div className="ad-banner-content">📱 広告 - 有料プランで広告なし</div>
    </div>
  );
};

export default AdBanner;
