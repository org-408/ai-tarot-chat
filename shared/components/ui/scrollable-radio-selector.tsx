import type { JSX } from "react";

interface SelectorItem {
  id: string;
  name?: string;
  icon?: React.ReactNode;
  /** 詳細説明 (bio または description を優先して表示) */
  bio?: string;
  description?: string;
}

interface ScrollableRadioSelectorProps<T extends SelectorItem> {
  title: string;
  subtitle?: string;
  items: T[];
  selected: T | null;
  onSelect: (item: T) => void;
  maxVisibleItems?: number;
}

/**
 * スクロール可能なラジオ選択コンポーネント。プラットフォーム非依存。
 * モバイル固有 CSS クラス (option-item, radio-button など) を使わず
 * Tailwind クラスのみで実装。
 */
export function ScrollableRadioSelector<T extends SelectorItem>({
  title,
  subtitle,
  items,
  selected,
  onSelect,
  maxVisibleItems = 3,
}: ScrollableRadioSelectorProps<T>): JSX.Element {
  const needsScroll = items.length > maxVisibleItems;
  const maxHeight = needsScroll ? `${maxVisibleItems * 4.5}rem` : "auto";

  if (items.length === 0) {
    return <div className="text-sm text-gray-400 py-2">読み込み中...</div>;
  }

  return (
    <div className="mb-4">
      <div className="text-sm font-semibold text-gray-700 mb-1">{title}</div>
      {subtitle && (
        <div className="text-xs text-gray-500 mb-2">{subtitle}</div>
      )}
      <div
        className={`space-y-2 ${needsScroll ? "overflow-y-auto pr-1" : ""}`}
        style={{
          maxHeight,
          scrollbarWidth: "thin",
          scrollbarColor: "#a855f7 #f3f4f6",
        }}
      >
        {items.map((item) => {
          const isSelected = selected?.id === item.id;
          const detail = item.bio ?? item.description;

          return (
            <div
              key={item.id}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onSelect(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(item);
                }
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 bg-white hover:border-purple-300"
              }`}
            >
              {/* ラジオボタン */}
              <div
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  isSelected
                    ? "border-purple-500 bg-purple-500"
                    : "border-gray-400"
                }`}
              >
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>

              {/* ラベル */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  {item.icon && <span>{item.icon}</span>}
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? "text-purple-900" : "text-gray-800"
                    }`}
                  >
                    {item.name}
                  </span>
                </div>
                {detail && (
                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {needsScroll && (
        <div className="text-xs text-gray-400 text-center mt-1">
          ↕️ スクロールして他の選択肢を見る
        </div>
      )}
    </div>
  );
}
