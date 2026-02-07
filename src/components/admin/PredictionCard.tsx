import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { DashboardStats } from '@/hooks/useDashboardStats';

interface Props {
  stats: DashboardStats;
}

const PredictionCard = ({ stats }: Props) => {
  const { predictedCandlesNextWeek, candlesLastWeek, postsLastWeek, postsPrevWeek } = stats;

  // Calculate trend
  const trend = postsPrevWeek > 0
    ? ((postsLastWeek - postsPrevWeek) / postsPrevWeek * 100).toFixed(0)
    : postsLastWeek > 0 ? '+100' : '0';

  const trendPositive = Number(trend) >= 0;

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50 relative overflow-hidden">
      {/* Subtle gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--gesture-candle)/0.05)] to-transparent pointer-events-none" />

      <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[hsl(var(--gesture-candle))]" />
          Projection de Ferveur
        </CardTitle>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                <Info className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px] text-xs">
              Estimation basée sur la ferveur actuelle et la dynamique du maillage social.
              Calcul : tendance hebdomadaire × facteur d'engagement.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-3xl font-bold text-foreground tabular-nums">
          {predictedCandlesNextWeek.toLocaleString()}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          cierges prévus cette semaine
        </p>

        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1">
            <span className={`text-xs font-medium ${trendPositive ? 'text-[hsl(var(--accent-green))]' : 'text-destructive'}`}>
              {trendPositive ? '↗' : '↘'} {trend}%
            </span>
            <span className="text-[10px] text-muted-foreground">tendance</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="text-[10px] text-muted-foreground">
            <span className="font-medium text-foreground">{candlesLastWeek}</span> cierges cette semaine
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PredictionCard;
