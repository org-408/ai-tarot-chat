import { useEffect, useState } from "react";
import type { Plan, Tarotist } from "../../../shared/lib/types";
import { canUseTarotist, renderStars } from "../lib/utils/salon";
import type { UserPlan } from "../types";

interface ProfileDialogProps {
  // for selectedTarotist
  selectedTarotist: Tarotist;
  // for profile
  profileClicked?: boolean;
  // for image view
  imageViewClicked?: boolean;
  // plan button display
  hasButton?: boolean;
  currentPlan?: Plan;
  onChangePlan?: (planCode: UserPlan) => void;
  isChangingPlan?: boolean;
}

const ProfileDialog: React.FC<ProfileDialogProps> = ({
  selectedTarotist,
  profileClicked = false,
  imageViewClicked = false,
  hasButton = true,
  currentPlan,
  onChangePlan = () => {},
  isChangingPlan,
}) => {
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showImageViewDialog, setShowImageViewDialog] = useState(false);

  const handleChangePlan = (requiredPlan: UserPlan) => {
    onChangePlan(requiredPlan);
  };

  useEffect(() => {
    if (profileClicked) {
      setShowProfileDialog(true);
    }
  }, [profileClicked]);

  useEffect(() => {
    if (imageViewClicked) {
      setShowImageViewDialog(true);
    }
  }, [imageViewClicked]);

  return (
    <>
      {/* プロフィール拡大ダイアログ */}
      {showProfileDialog && selectedTarotist && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowProfileDialog(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: `linear-gradient(to bottom, ${selectedTarotist.primaryColor} 0%, white 40%)`,
            }}
          >
            {/* プランバッジ */}
            <div className="flex justify-center mb-4">
              <div
                className="text-white text-sm px-3 py-1 rounded-full"
                style={{
                  backgroundColor: selectedTarotist.plan!.accentColor,
                }}
              >
                {selectedTarotist.plan!.name}プラン
              </div>
            </div>

            {/* 占い師画像(カラー・拡大) */}
            <div className="flex justify-center mb-4">
              <img
                src={`/tarotists/${selectedTarotist.name}.png`}
                alt={selectedTarotist.title}
                className="w-48 h-48 rounded-xl object-cover shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileDialog(false);
                  setShowImageViewDialog(true);
                }}
                onError={(e) => {
                  e.currentTarget.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='80'%3E🔮%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>

            {/* 名前(筆記体で強調) */}
            <h3
              className="text-3xl font-bold text-center mb-1"
              style={{
                fontFamily: "'Brush Script MT', cursive",
                color: selectedTarotist.accentColor,
              }}
            >
              {selectedTarotist.icon} {selectedTarotist.name}
            </h3>

            {/* タイトル */}
            <div className="text-center text-sm text-gray-600 mb-2">
              {selectedTarotist.title}
            </div>

            {/* 特徴 */}
            <div
              className="text-center text-sm font-semibold mb-4"
              style={{ color: selectedTarotist.accentColor }}
            >
              {selectedTarotist.trait}
            </div>

            {/* おすすめ度 */}
            <div className="flex items-center justify-center gap-2 mb-4 pb-4 border-b border-gray-200">
              <div className="text-xs text-gray-600">おすすめ度:</div>
              <div className="text-lg">
                {renderStars(selectedTarotist.quality!)}
              </div>
            </div>

            {/* プロフィール */}
            <div className="text-sm text-gray-700 leading-relaxed mb-6">
              {selectedTarotist.bio}
            </div>

            {/* アクションボタン */}
            {hasButton ? (
              !canUseTarotist(selectedTarotist.plan!, currentPlan!) ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChangePlan(selectedTarotist.plan!.code as UserPlan);
                    setShowProfileDialog(false);
                  }}
                  disabled={isChangingPlan}
                  className="w-full py-3 px-4 text-xs text-white rounded-lg font-medium transition-all mb-3 shadow-md"
                  style={{
                    backgroundColor: selectedTarotist.plan!.accentColor,
                  }}
                >
                  {isChangingPlan
                    ? "認証中..."
                    : `${selectedTarotist.plan!.name}にアップグレード`}
                </button>
              ) : (
                <div
                  className="w-full py-3 px-4 border-2 text-center rounded-lg font-bold mb-3"
                  style={{
                    borderColor: selectedTarotist.accentColor,
                    color: selectedTarotist.accentColor,
                    backgroundColor: `${selectedTarotist.primaryColor}80`, // 80 -> 透明度50%
                  }}
                >
                  ✓ この占い師は利用可能です
                </div>
              )
            ) : null}

            {/* 閉じるボタン */}
            <button
              onClick={() => setShowProfileDialog(false)}
              className="w-full text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg py-2 font-medium transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 画像全画面表示ダイアログ */}
      {showImageViewDialog && selectedTarotist && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60]"
          onClick={() => setShowImageViewDialog(false)}
        >
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            {/* 閉じるボタン */}
            {/* <button
              onClick={() => setImageViewTarotist(null)}
              className="absolute top-32 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-2xl transition-colors z-10"
            >
              ×
            </button> */}

            {/* タイトル表示 */}
            <div className="absolute top-32 left-4 right-16 text-white z-10">
              <div
                className="text-2xl font-bold mb-1"
                style={{ fontFamily: "'Brush Script MT', cursive" }}
              >
                {selectedTarotist.icon} {selectedTarotist.name}
              </div>
              <div className="text-sm opacity-90">{selectedTarotist.title}</div>
              <div className="text-sm opacity-80">{selectedTarotist.trait}</div>
            </div>

            {/* 画像 */}
            <img
              src={`/tarotists/${selectedTarotist.name}.png`}
              alt={selectedTarotist.title}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                e.currentTarget.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='120'%3E🔮%3C/text%3E%3C/svg%3E";
              }}
            />

            {/* タップで閉じるヒント */}
            <div className="absolute bottom-32 text-white/60 text-sm">
              背景タップで閉じる
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileDialog;
