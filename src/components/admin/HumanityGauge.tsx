import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";

interface HumanityGaugeProps {
  interMemorialLinks: number;
  totalMemorials: number;
}

/**
 * Circular gauge visualizing the global "Humanity Index" —
 * the density of inter-memorial links relative to total memorials.
 */
const HumanityGauge = ({ interMemorialLinks, totalMemorials }: HumanityGaugeProps) => {
  const maxLinks = Math.max(totalMemorials * 2, 1); // theoretical max: 2 links per memorial
  const ratio = Math.min(1, interMemorialLinks / maxLinks);
  const percentage = Math.round(ratio * 100);

  // SVG circular gauge parameters
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - ratio * circumference;

  // Color based on percentage
  const gaugeColor =
    percentage >= 60
      ? "hsl(var(--accent-green))"
      : percentage >= 30
      ? "hsl(45, 90%, 50%)"
      : "hsl(340, 60%, 65%)";

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(45,90%,50%,0.04)] to-[hsl(340,60%,65%,0.04)] pointer-events-none" />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Heart className="w-4 h-4 text-[hsl(340,60%,65%)]" />
          Indice d'Humanité
        </CardTitle>
      </CardHeader>
      <CardContent className="relative flex flex-col items-center">
        {/* Circular Gauge */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
            />
            {/* Progress arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={gaugeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
              style={{
                filter: `drop-shadow(0 0 6px ${gaugeColor})`,
              }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums" style={{ color: gaugeColor }}>
              {interMemorialLinks}
            </span>
            <span className="text-[9px] text-muted-foreground -mt-0.5">liens</span>
          </div>
        </div>

        {/* Stats below gauge */}
        <div className="mt-3 text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{percentage}%</span> de couverture du maillage
          </p>
          <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[200px]">
            Chaque validation fait grandir cet indice et rapproche les communautés familiales.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HumanityGauge;
