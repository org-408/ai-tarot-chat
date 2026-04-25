import type { ReadingCategory } from "../../../shared/lib/types";

interface CategoryChipSelectorProps {
  categories: ReadingCategory[];
  selected: ReadingCategory | null;
  onSelect: (category: ReadingCategory) => void;
}

const CategoryChipSelector: React.FC<CategoryChipSelectorProps> = ({
  categories,
  selected,
  onSelect,
}) => {
  return (
    <div
      className="m-1 px-2 flex gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: "none" }}
    >
      {categories.map((cat) => {
        const isSelected = cat.id === selected?.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat)}
            className={`flex-shrink-0 px-4 py-2 rounded-full backdrop-blur-sm border text-sm shadow-sm active:scale-95 transition-all ${
              isSelected
                ? "bg-purple-600 border-purple-600 text-white"
                : "bg-white/80 border-purple-200 text-purple-700"
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryChipSelector;
