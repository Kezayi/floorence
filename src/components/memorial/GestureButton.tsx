import { Flame, Flower2 } from "lucide-react";

interface GestureButtonProps {
  type: "RIP" | "CANDLE" | "FLOWER";
  count: number;
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
}

const gestureConfig = {
  RIP: {
    icon: "🕊",
    label: "Repos en paix",
    className: "bg-secondary hover:bg-muted",
  },
  CANDLE: {
    icon: Flame,
    label: "Allumer un cierge",
    className: "bg-secondary hover:bg-muted",
    iconColor: "text-candle-glow",
  },
  FLOWER: {
    icon: Flower2,
    label: "Déposer une fleur",
    className: "bg-secondary hover:bg-muted",
    iconColor: "text-flower-soft",
  },
};

const GestureButton = ({
  type,
  count,
  onClick,
  disabled = false,
  isActive = false,
}: GestureButtonProps) => {
  const config = gestureConfig[type];
  const Icon = typeof config.icon === "string" ? null : config.icon;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center gap-2 p-4 rounded-sm transition-all duration-300
        ${config.className}
        ${isActive ? "ring-1 ring-primary" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <div className={`relative ${type !== "RIP" ? "candle-glow" : ""}`}>
        {type === "RIP" ? (
          <span className="text-2xl">🕊</span>
        ) : type === "CANDLE" ? (
          <Flame className="w-6 h-6 text-candle-glow" />
        ) : (
          <Flower2 className="w-6 h-6 text-flower-soft" />
        )}
      </div>
      <span className="font-sans text-xs text-muted-foreground">
        {config.label}
      </span>
      <span className="font-serif text-lg">
        {count.toLocaleString("fr-FR")}
      </span>
    </button>
  );
};

export default GestureButton;
