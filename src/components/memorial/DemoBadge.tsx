interface DemoBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

const DemoBadge = ({ size = "sm", className = "" }: DemoBadgeProps) => {
  const sizeClasses = size === "sm" 
    ? "px-2 py-0.5 text-[10px]" 
    : "px-3 py-1 text-xs";

  return (
    <span
      className={`
        inline-flex items-center gap-1 font-sans font-medium tracking-wide uppercase
        rounded-full backdrop-blur-md
        border border-[hsl(var(--candle-glow)/0.3)]
        bg-[hsl(var(--candle-glow)/0.15)]
        text-[hsl(var(--candle-glow))]
        shadow-[0_0_8px_hsl(var(--candle-glow)/0.15)]
        ${sizeClasses}
        ${className}
      `}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--candle-glow))] animate-pulse" />
      Démo
    </span>
  );
};

export default DemoBadge;
