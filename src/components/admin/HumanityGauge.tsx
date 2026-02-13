import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Flame, Flower2, MessageCircle, Link2 } from "lucide-react";
import type { DashboardStats } from "@/hooks/useDashboardStats";

interface HumanityGaugeProps {
  stats: DashboardStats;
}

// Poids de chaleur par catégorie de relation
const CATEGORY_WEIGHTS = {
  familleDirecte: 10,
  socioCoeur: 8,
  familleElargie: 7,
  allies: 6,
  autres: 2,
};

// Pondération des gestes
const GESTURE_WEIGHTS = {
  candle: 1,
  flower: 1,
  post: 1.5, // Les hommages écrits pèsent un peu plus
};

// Bonus par lien d'inférence inter-mémorial
const INFERENCE_BONUS = 5;

/**
 * Calcule l'Indice d'Humanité pondéré :
 * Index = Σ(Posts × Poids_Catégorie) + Gestes + Bonus_Inférence
 */
function computeHumanityIndex(stats: DashboardStats) {
  const densityScore =
    stats.catFamilleDirecte * CATEGORY_WEIGHTS.familleDirecte +
    stats.catFamilleElargie * CATEGORY_WEIGHTS.familleElargie +
    stats.catAllies * CATEGORY_WEIGHTS.allies +
    stats.catSocioCoeur * CATEGORY_WEIGHTS.socioCoeur +
    stats.catAutres * CATEGORY_WEIGHTS.autres;

  const gestureScore =
    stats.totalCandles * GESTURE_WEIGHTS.candle +
    stats.totalFlowers * GESTURE_WEIGHTS.flower +
    stats.totalPosts * GESTURE_WEIGHTS.post;

  const inferenceBonus = stats.interMemorialLinks * INFERENCE_BONUS;

  return {
    total: Math.round(densityScore + gestureScore + inferenceBonus),
    densityScore: Math.round(densityScore),
    gestureScore: Math.round(gestureScore),
    inferenceBonus: Math.round(inferenceBonus),
  };
}

/**
 * Jauge circulaire de l'Indice d'Humanité —
 * somme pondérée de la densité du maillage, de l'intensité des gestes
 * et de la vitalité énergétique (liens d'inférence).
 */
const HumanityGauge = ({ stats }: HumanityGaugeProps) => {
  const index = computeHumanityIndex(stats);

  // Échelle dynamique : le max est le score actuel × 2 (ou 100 minimum)
  const maxScore = Math.max(100, index.total * 2);
  const ratio = Math.min(1, index.total / maxScore);
  const percentage = Math.round(ratio * 100);

  // SVG circular gauge parameters
  const size = 130;
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
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
            />
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
              style={{ filter: `drop-shadow(0 0 6px ${gaugeColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums" style={{ color: gaugeColor }}>
              {index.total}
            </span>
            <span className="text-[9px] text-muted-foreground -mt-0.5">points</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-3 w-full space-y-1.5">
          <BreakdownRow
            icon={<MessageCircle className="w-3 h-3" />}
            label="Densité maillage"
            value={index.densityScore}
            color="hsl(var(--tab-verite))"
          />
          <BreakdownRow
            icon={<Flame className="w-3 h-3" />}
            label="Gestes de mémoire"
            value={index.gestureScore}
            color="hsl(var(--gesture-candle))"
          />
          <BreakdownRow
            icon={<Link2 className="w-3 h-3" />}
            label="Vitalité énergétique"
            value={index.inferenceBonus}
            color="hsl(270, 60%, 65%)"
          />
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[220px] text-center mt-2">
          Communion sociale pondérée : qualité des liens × intensité des gestes × énergie d'inférence.
        </p>
      </CardContent>
    </Card>
  );
};

const BreakdownRow = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) => (
  <div className="flex items-center justify-between text-xs">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span style={{ color }}>{icon}</span>
      <span>{label}</span>
    </div>
    <span className="font-semibold tabular-nums" style={{ color }}>
      +{value}
    </span>
  </div>
);

export default HumanityGauge;
