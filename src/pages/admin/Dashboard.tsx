import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flower2, MessageSquare, DollarSign, Users, Trophy, Flame, AlertCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { DashboardSkeleton } from '@/components/admin/AdminSkeletons';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import SocialDonutChart from '@/components/admin/SocialDonutChart';
import SuperConnectorsWidget from '@/components/admin/SuperConnectorsWidget';
import PredictionCard from '@/components/admin/PredictionCard';

interface DailyRevenue {
  date: string;
  revenue: number;
  label: string;
}

interface MemorialRanking {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  postCount: number;
  totalCandles: number;
  totalFlowers: number;
  totalInteractions: number;
}

const CACHE_CONFIG = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 };

const Dashboard = () => {
  // New: unified stats from v_dashboard_stats view
  const { data: dashStats, isLoading: dashLoading, error: dashError, refetch: refetchDash } = useDashboardStats();

  // Revenue chart data (still needs daily granularity)
  const { data: revenueData } = useQuery({
    queryKey: ['admin-revenue-chart'],
    ...CACHE_CONFIG,
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_transactions')
        .select('amount, status, created_at');

      const completedTransactions = (data || []).filter(t => t.status === 'completed');

      const last30Days: DailyRevenue[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const dayRevenue = completedTransactions
          .filter(t => {
            const txDate = new Date(t.created_at);
            return txDate >= dayStart && txDate <= dayEnd;
          })
          .reduce((sum, t) => sum + t.amount, 0);

        last30Days.push({
          date: format(date, 'yyyy-MM-dd'),
          revenue: dayRevenue,
          label: format(date, 'dd MMM', { locale: fr }),
        });
      }
      return last30Days;
    },
  });

  // Memorial rankings
  const { data: rankings } = useQuery({
    queryKey: ['admin-memorial-rankings'],
    ...CACHE_CONFIG,
    queryFn: async () => {
      const { data: memorials } = await supabase
        .from('memorials')
        .select('id, slug, first_name, last_name')
        .eq('is_active', true);

      if (!memorials || memorials.length === 0) return [];

      const memorialIds = memorials.map(m => m.id);
      const { data: gestureStats } = await supabase
        .rpc('get_memorial_gesture_stats', { p_memorial_ids: memorialIds });

      const statsMap: Record<string, { post_count: number; total_candles: number; total_flowers: number }> = {};
      (gestureStats || []).forEach(s => { statsMap[s.memorial_id] = s; });

      const result: MemorialRanking[] = memorials.map(m => {
        const s = statsMap[m.id] || { post_count: 0, total_candles: 0, total_flowers: 0 };
        return {
          id: m.id,
          slug: m.slug,
          firstName: m.first_name,
          lastName: m.last_name,
          postCount: Number(s.post_count),
          totalCandles: Number(s.total_candles),
          totalFlowers: Number(s.total_flowers),
          totalInteractions: Number(s.post_count) + Number(s.total_candles) + Number(s.total_flowers),
        };
      });

      result.sort((a, b) => b.totalInteractions - a.totalInteractions);
      return result.slice(0, 10);
    },
  });

  if (dashLoading) return <DashboardSkeleton />;

  if (dashError) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-8">Tableau de bord</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Erreur de chargement</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-2">
              Impossible de charger les statistiques du tableau de bord.
            </p>
            <code className="text-xs bg-muted px-3 py-1.5 rounded text-destructive mb-6 max-w-lg break-all">
              {dashError.message}
            </code>
            <Button variant="outline" onClick={() => refetchDash()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    { title: 'Utilisateurs', value: dashStats?.totalUsers || 0, icon: Users, color: 'text-muted-foreground' },
    { title: 'Espaces mémoriels', value: dashStats?.totalMemorials || 0, icon: Flower2, color: 'text-primary', sub: dashStats ? `${dashStats.realMemorials} réels · ${dashStats.demoMemorials} démo` : undefined },
    { title: 'Hommages visibles', value: dashStats?.visiblePosts || 0, icon: MessageSquare, color: 'text-muted-foreground', sub: dashStats ? `${dashStats.postsLastWeek} cette semaine` : undefined },
    { title: 'Chiffre d\'affaires', value: `${(dashStats?.totalRevenue || 0).toLocaleString()} FCFA`, icon: DollarSign, color: 'text-[hsl(var(--accent-green))]' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-8">Tableau de bord</h1>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</div>
              {stat.sub && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Prediction + Donut + Connectors Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {dashStats && <PredictionCard stats={dashStats} />}
        {dashStats && <SocialDonutChart stats={dashStats} />}
        <SuperConnectorsWidget />
      </div>

      {/* Memorial Rankings */}
      <Card className="mb-6 bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[hsl(var(--gesture-candle))]" />
            Classement des espaces mémoriels les plus actifs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rankings && rankings.length > 0 ? (
            <div className="space-y-3">
              {rankings.map((memorial, index) => (
                <div
                  key={memorial.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-[hsl(var(--gesture-candle))] text-foreground' :
                      index === 1 ? 'bg-muted-foreground/30 text-foreground' :
                      index === 2 ? 'bg-[hsl(var(--gesture-candle)/0.6)] text-foreground' :
                      'bg-muted-foreground/20 text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <Link
                        to={`/memorial/${memorial.slug}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {memorial.firstName} {memorial.lastName}
                      </Link>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {memorial.postCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {memorial.totalCandles}
                        </span>
                        <span className="flex items-center gap-1">
                          <Flower2 className="w-3 h-3" />
                          {memorial.totalFlowers}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {memorial.totalInteractions.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">interactions</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">
              Aucune donnée de classement disponible
            </p>
          )}
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      <Card className="mb-6 bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Évolution du chiffre d'affaires (30 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {revenueData && revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} FCFA`, 'Revenus']}
                    labelFormatter={(label) => label}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gesture stats summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
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
                <div className="text-2xl font-bold">{dashStats?.totalCandles.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Cierges allumés</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Flower2 className="w-6 h-6 text-[hsl(var(--gesture-flower))] mx-auto mb-2" />
                <div className="text-2xl font-bold">{dashStats?.totalFlowers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Fleurs déposées</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4" />
              Activité hebdomadaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Hommages cette semaine</span>
                <span className="font-bold">{dashStats?.postsLastWeek}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Semaine précédente</span>
                <span className="font-bold">{dashStats?.postsPrevWeek}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <span className="text-sm text-muted-foreground">Variation</span>
                <span className={`font-bold ${
                  (dashStats?.postsLastWeek || 0) >= (dashStats?.postsPrevWeek || 0)
                    ? 'text-[hsl(var(--accent-green))]'
                    : 'text-destructive'
                }`}>
                  {dashStats?.postsPrevWeek
                    ? `${(((dashStats.postsLastWeek - dashStats.postsPrevWeek) / dashStats.postsPrevWeek) * 100).toFixed(0)}%`
                    : dashStats?.postsLastWeek ? '+∞' : '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
