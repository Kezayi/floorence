import { ArrowUp, ArrowDown, Users } from "lucide-react";
import { type ViewFilter, VIEW_FILTER_LABELS } from "./lineageConstants";

interface LineageViewFilterProps {
  value: ViewFilter;
  onChange: (v: ViewFilter) => void;
}

const FILTER_ICONS: Record<ViewFilter, typeof ArrowUp> = {
  ascendance: ArrowUp,
  descendance: ArrowDown,
  complete: Users,
};

const LineageViewFilter = ({ value, onChange }: LineageViewFilterProps) => {
  const filters: ViewFilter[] = ["complete", "ascendance", "descendance"];

  return (
    <div className="flex items-center gap-1 bg-muted/40 rounded-sm p-0.5">
      {filters.map(f => {
        const Icon = FILTER_ICONS[f];
        const isActive = value === f;
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans rounded-sm transition-all ${
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3 h-3" />
            {VIEW_FILTER_LABELS[f]}
          </button>
        );
      })}
    </div>
  );
};

export default LineageViewFilter;
