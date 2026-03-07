import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { subDays, startOfDay, endOfDay, subHours, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Transaction {
  id: string | null;
  date_libreville: string | null;
  status: string | null;
  amount: number | null;
}

interface OperatorHealthBarProps {
  transactions: Transaction[];
  onFilterIncidents: () => void;
}

const OperatorHealthBar = ({ transactions, onFilterIncidents }: OperatorHealthBarProps) => {
  const metrics = useMemo(() => {
    const now = new Date();
    const yesterday = subHours(now, 24);
    const threeHoursAgo = subHours(now, 3);

    // Global conversion rate
    const total = transactions.length;
    const successCount = transactions.filter(t => t.status === 'success').length;
    const conversionRate = total > 0 ? Math.round((successCount / total) * 100) : 0;

    // Volume 24h
    const volume24h = transactions.filter(t => {
      if (!t.date_libreville) return false;
      return new Date(t.date_libreville) >= yesterday;
    }).length;

    // Timeouts last 3h
    const timeouts3h = transactions.filter(t => {
      if (!t.date_libreville || t.status !== 'timeout') return false;
      return new Date(t.date_libreville) >= threeHoursAgo;
    }).length;

    // 7-day success rate chart
    const chartData: { day: string; rate: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const dayTx = transactions.filter(t => {
        if (!t.date_libreville) return false;
        const d = new Date(t.date_libreville);
        return d >= dayStart && d <= dayEnd;
      });
      const daySuccess = dayTx.filter(t => t.status === 'success').length;
      const rate = dayTx.length > 0 ? Math.round((daySuccess / dayTx.length) * 100) : 0;
      chartData.push({ day: format(date, 'EEE', { locale: fr }), rate });
    }

    return { conversionRate, volume24h, timeouts3h, chartData };
  }, [transactions]);

  const rateColor = metrics.conversionRate >= 70
    ? 'text-emerald-500'
    : metrics.conversionRate >= 50
      ? 'text-amber-500'
      : 'text-destructive';

  const rateBg = metrics.conversionRate >= 70
    ? 'border-emerald-500/20 bg-emerald-500/5'
    : metrics.conversionRate >= 50
      ? 'border-amber-500/20 bg-amber-500/5'
      : 'border-destructive/20 bg-destructive/5';

  const rateLabel = metrics.conversionRate >= 70
    ? 'Réseau stable'
    : metrics.conversionRate >= 50
      ? 'Alerte Réseau'
      : 'Coupure Opérateur';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Indicateurs de Performance
        </h2>
        <Button variant="outline" size="sm" onClick={onFilterIncidents} className="gap-1.5">
          <AlertTriangle className="w-4 h-4" />
          Rapport d'incidents
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Conversion Rate */}
        <Card className={`shadow-sm ${rateBg}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taux de Conversion</CardTitle>
            <CheckCircle className={`w-5 h-5 ${rateColor}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${rateColor}`}>{metrics.conversionRate}%</div>
            <p className={`text-xs mt-1 ${rateColor} font-medium`}>{rateLabel}</p>
          </CardContent>
        </Card>

        {/* Volume 24h */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Volume 24h</CardTitle>
            <Activity className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.volume24h}</div>
            <p className="text-xs text-muted-foreground mt-1">transactions</p>
          </CardContent>
        </Card>

        {/* Timeout Alerts */}
        <Card className={`shadow-sm ${metrics.timeouts3h > 0 ? 'border-amber-500/20 bg-amber-500/5' : 'border-border/50'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertes Timeouts (3h)</CardTitle>
            <AlertTriangle className={`w-5 h-5 ${metrics.timeouts3h > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${metrics.timeouts3h > 0 ? 'text-amber-500' : ''}`}>{metrics.timeouts3h}</div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.timeouts3h === 0 ? 'Aucune alerte' : 'Vérifiez les passerelles'}</p>
          </CardContent>
        </Card>
      </div>

      {/* 7-day health chart */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Santé Réseau — 7 derniers jours
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[260px] text-xs">
                  Si le taux chute brusquement, vérifiez l'état des passerelles Airtel/Moov.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.chartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                <RechartsTooltip
                  formatter={(value: number) => [`${value}%`, 'Taux de succès']}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="rate"
                  radius={[4, 4, 0, 0]}
                  fill="hsl(var(--primary))"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperatorHealthBar;
