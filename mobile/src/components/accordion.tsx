import { ChevronDown } from "lucide-react";
import { useState } from "react";

export interface AccordionItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  content: React.ReactNode;
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

interface AccordionProps {
  items: AccordionItem[];
  defaultExpanded?: string | null;
  onExpand?: (id: string | null) => void;
}

const Accordion: React.FC<AccordionProps> = ({
  items,
  defaultExpanded = null,
  onExpand,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(defaultExpanded);

  const handleToggle = (id: string) => {
    const newExpandedId = expandedId === id ? null : id;
    setExpandedId(newExpandedId);
    if (onExpand) {
      onExpand(newExpandedId);
    }
  };

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isExpanded = expandedId === item.id;
        const colors = item.colors || {
          primary: "#F9FAFB",
          secondary: "#E5E7EB",
          accent: "#6B7280",
        };

        return (
          <div
            key={item.id}
            className="border-2 rounded-lg overflow-hidden transition-all"
            style={{ borderColor: colors.secondary }}
          >
            {/* アコーディオンヘッダー */}
            <button
              onClick={() => handleToggle(item.id)}
              className="w-full p-3 flex items-center justify-between transition-colors"
              style={{ backgroundColor: colors.primary }}
            >
              <div className="text-left flex-1">
                <div
                  className="font-bold flex items-center gap-1"
                  style={{ color: colors.accent }}
                >
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.title}</span>
                </div>
                {item.subtitle && (
                  <div className="text-xs text-gray-600 mt-0.5">
                    {item.subtitle}
                  </div>
                )}
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform flex-shrink-0 ml-2 ${
                  isExpanded ? "rotate-180" : ""
                }`}
                style={{ color: colors.accent }}
              />
            </button>

            {/* アコーディオンコンテンツ */}
            {isExpanded && (
              <div
                className="p-3 bg-white border-t-2"
                style={{ borderColor: colors.secondary }}
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;
