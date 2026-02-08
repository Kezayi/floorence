import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Flower2 } from 'lucide-react';
import HumanityGauge from '@/components/admin/HumanityGauge';
import LiveActivityFeed from '@/components/admin/LiveActivityFeed';
import type { DashboardStats } from '@/hooks/useDashboardStats';

interface Props {
  stats: DashboardStats;
}

const TabImpact = ({ stats }: Props) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gesture Intensity */}
        <Card className="bg-card shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Flame className="w-4 h-4 text-[hsl(var(--gesture-candle))]" />
              Intensité des Gestes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Flame className="w-6 h-6 text-[hsl(var(--gesture-candle))] mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalCandles.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Cierges allumés</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Flower2 className="w-6 h-6 text-[hsl(var(--gesture-flower))] mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalFlowers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Fleurs déposées</p>
              </div>
            </div>
            {/* Weekly stats */}
            <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Hommages cette semaine</span>
                <span className="text-sm font-bold">{stats.postsLastWeek}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Semaine précédente</span>
                <span className="text-sm font-bold">{stats.postsPrevWeek}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-border/30">
                <span className="text-xs text-muted-foreground">Variation</span>
                <span className={`text-sm font-bold ${
                  stats.postsLastWeek >= stats.postsPrevWeek
                    ? 'text-[hsl(var(--accent-green))]'
                    : 'text-destructive'
                }`}>
                  {stats.postsPrevWeek
                    ? `${(((stats.postsLastWeek - stats.postsPrevWeek) / stats.postsPrevWeek) * 100).toFixed(0)}%`
                    : stats.postsLastWeek ? `Nouveaux : ${stats.postsLastWeek}` : '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Humanity Gauge */}
        <HumanityGauge
          interMemorialLinks={stats.interMemorialLinks}
          totalMemorials={stats.totalMemorials}
        />

        {/* Live Activity Feed */}
        <LiveActivityFeed />
      </div>
    </div>
  );
};

export default TabImpact;
