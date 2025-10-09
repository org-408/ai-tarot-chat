import React from "react";

interface RadioItem {
  id: string;
  label: string;
  description?: string;
  icon?: string;
}

interface ScrollableRadioSelectorProps {
  title: string;
  items: RadioItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  maxVisibleItems?: number;
}

const ScrollableRadioSelector: React.FC<ScrollableRadioSelectorProps> = ({
  title,
  items,
  selectedId,
  onSelect,
  maxVisibleItems = 3,
}) => {
  const needsScroll = items.length > maxVisibleItems;
  const maxHeight = needsScroll ? `${maxVisibleItems * 4.5}rem` : "auto";

  return (
    <div className="mb-6">
      <div className="section-title">{title}</div>
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
              selectedId === item.id ? "selected" : ""
            }`}
            onClick={() => onSelect(item.id)}
          >
            <div
              className={`radio-button ${
                selectedId === item.id ? "selected" : ""
              }`}
            ></div>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </div>
              {item.description && (
                <div className="text-xs text-gray-500 mt-0.5">
                  {item.description}
                </div>
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
};

export default ScrollableRadioSelector;
