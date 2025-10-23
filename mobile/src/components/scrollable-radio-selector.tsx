import React, { type JSX } from "react";

interface SelectorItem {
  id: string;
  name?: string;
  icon?: React.ReactNode;
  bio?: string;
  description?: string;
}

interface ScrollableRadioSelectorProps<T extends SelectorItem> {
  title: string;
  subtitle?: string;
  items: T[];
  selected: T | null;
  onSelect: (tarotist: T) => void;
  maxVisibleItems?: number;
}

function ScrollableRadioSelector<T extends SelectorItem>({
  title,
  subtitle,
  items,
  selected,
  onSelect,
  maxVisibleItems = 3,
}: ScrollableRadioSelectorProps<T>): JSX.Element {
  const needsScroll = items.length > maxVisibleItems;
  const maxHeight = needsScroll ? `${maxVisibleItems * 4.5}rem` : "auto";

  if (!selected || items.length === 0) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="mb-6">
      <div className="section-title">{title}</div>
      {subtitle && <div className="section-subtitle gap-8">{subtitle}</div>}
      <div
        className={`space-y-2 ${needsScroll ? "overflow-y-auto pr-1" : ""}`}
        style={{
          maxHeight: maxHeight,
          scrollbarWidth: "thin",
          scrollbarColor: "#a855f7 #f3f4f6",
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`option-item ${
              selected!.id === item.id ? "selected" : ""
            }`}
            onClick={() => onSelect(item)}
          >
            <div
              className={`radio-button ${
                selected!.id === item.id ? "selected" : ""
              }`}
            ></div>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                {item.icon && <span>{item.icon}</span>}
                <span>{item.name}</span>
              </div>
              {item.bio && (
                <div className="text-xs text-gray-500 mt-0.5">{item.bio}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      {needsScroll && (
        <div className="text-xs text-gray-400 text-center mt-1">
          ↕️ スクロールして他の選択肢を見る
        </div>
      )}
    </div>
  );
}

export default ScrollableRadioSelector;
