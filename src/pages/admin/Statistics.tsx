import { useQuery } from '@tanstack/react-query';
import WebVitalsPanel from '@/components/admin/WebVitalsPanel';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, MessageSquare, Flame } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const Statistics = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-statistics'],
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const today = new Date();
      const last30Days = subDays(today, 30);
      const last7Days = subDays(today, 7);

      // Get posts from last 30 days
      const { data: recentPosts } = await supabase
        .from('guestbook_posts')
        .select('created_at, candle_count, flower_count')
        .gte('created_at', last30Days.toISOString());

      // Get memorials from last 30 days
      const { data: recentMemorials } = await supabase
        .from('memorials')
        .select('created_at')
        .gte('created_at', last30Days.toISOString());

      // Calculate daily stats
      const dailyStats: Record<string, { posts: number; memorials: number }> = {};
      
      for (let i = 0; i < 30; i++) {
        const day = format(subDays(today, i), 'yyyy-MM-dd');
        dailyStats[day] = { posts: 0, memorials: 0 };
      }

      recentPosts?.forEach((post) => {
        const day = format(new Date(post.created_at), 'yyyy-MM-dd');
        if (dailyStats[day]) {
          dailyStats[day].posts++;
        }
      });

      recentMemorials?.forEach((memorial) => {
        const day = format(new Date(memorial.created_at), 'yyyy-MM-dd');
        if (dailyStats[day]) {
          dailyStats[day].memorials++;
        }
      });

      // Total gestures (candles + flowers)
      const totalCandles = recentPosts?.reduce((sum, p) => sum + p.candle_count, 0) || 0;
      const totalFlowers = recentPosts?.reduce((sum, p) => sum + p.flower_count, 0) || 0;

      // Last 7 days vs previous 7 days comparison
      const last7DaysPosts = recentPosts?.filter(
        (p) => new Date(p.created_at) >= last7Days
      ).length || 0;
      
      const previous7DaysPosts = recentPosts?.filter(
        (p) => new Date(p.created_at) < last7Days && new Date(p.created_at) >= subDays(today, 14)
      ).length || 0;

      // Smart growth: handle zero-baseline weeks
      const hasActivityLastWeek = last7DaysPosts > 0;
      const hasPreviousActivity = previous7DaysPosts > 0;

      let growthLabel: string;
      if (!hasActivityLastWeek && !hasPreviousActivity) {
        growthLabel = 'Aucune activité récente';
      } else if (!hasPreviousActivity && hasActivityLastWeek) {
        growthLabel = `Nouveaux cette semaine : ${last7DaysPosts}`;
      } else {
        const rate = Math.round(((last7DaysPosts - previous7DaysPosts) / previous7DaysPosts) * 100);
        growthLabel = `${rate >= 0 ? '+' : ''}${rate}%`;
      }

      // Compute max for Y-axis ceiling (round up to nearest 10 + margin)
      const allPostCounts = Object.values(dailyStats).map(d => d.posts);
      const rawMax = Math.max(...allPostCounts, 1);
      const yAxisMax = Math.ceil(rawMax * 1.1 / 10) * 10; // +10% margin, rounded

      return {
        totalPosts30Days: recentPosts?.length || 0,
        totalMemorials30Days: recentMemorials?.length || 0,
        totalCandles,
        totalFlowers,
        growthLabel,
        yAxisMax,
        dailyStats: Object.entries(dailyStats)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-14)
          .map(([date, data]) => ({
            date: format(new Date(date), 'dd MMM', { locale: fr }),
            ...data,
          })),
      };
    },
  });

  const chartConfig: ChartConfig = {
    posts: { label: 'Messages', color: 'hsl(var(--primary))' },
  };

  const statCards = [
    {
      title: 'Messages (30j)',
      value: stats?.totalPosts30Days || 0,
      icon: MessageSquare,
      description: 'Nouveaux messages d\'hommage',
    },
    {
      title: 'Mémoriaux (30j)',
      value: stats?.totalMemorials30Days || 0,
      icon: Users,
      description: 'Nouveaux espaces créés',
    },
    {
      title: 'Cierges allumés',
      value: stats?.totalCandles || 0,
      icon: BarChart3,
      description: 'Dans les 30 derniers jours',
    },
    {
      title: 'Fleurs déposées',
      value: stats?.totalFlowers || 0,
      icon: TrendingUp,
      description: 'Dans les 30 derniers jours',
    },
  ];

  if (isLoading) {
    return (
      <div>
        <div className="h-9 w-40 bg-muted rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-5 w-5 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-muted rounded animate-pulse mb-1" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-8">Statistiques</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Évolution (14 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.growthLabel && (
            <p className="text-sm text-muted-foreground mb-4">
              <Flame className="inline w-3.5 h-3.5 mr-1 text-primary" />
              {stats.growthLabel}
            </p>
          )}

          {stats?.dailyStats && stats.dailyStats.some(d => d.posts > 0) ? (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart data={stats.dailyStats} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  domain={[0, stats.yAxisMax ?? 'auto']}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="posts"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>Aucune activité détectée sur les 14 derniers jours.</p>
            </div>
          )}
        </CardContent>
      </Card>
      <WebVitalsPanel />
    </div>
  );
};

export default Statistics;
