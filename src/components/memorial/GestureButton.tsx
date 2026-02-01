import { CrossIcon, FlameIcon, ChrysanthemumIcon } from "./MemorialIcons";

interface GestureButtonProps {
  type: "RIP" | "CANDLE" | "FLOWER";
  count: number;
  onClick: () => void;
  disabled?: boolean;
  isActive?: boolean;
}

const gestureConfig = {
  RIP: {
    label: "Repos en paix",
    className: "bg-secondary hover:bg-muted",
  },
  CANDLE: {
    label: "Allumer un cierge",
    className: "bg-secondary hover:bg-muted",
  },
  FLOWER: {
    label: "Déposer une fleur",
    className: "bg-secondary hover:bg-muted",
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
      <div className={`relative ${type === "CANDLE" ? "candle-glow" : ""}`}>
        {type === "RIP" ? (
          <CrossIcon size={28} className="text-foreground" />
        ) : type === "CANDLE" ? (
          <FlameIcon size={28} />
        ) : (
          <ChrysanthemumIcon size={28} />
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
