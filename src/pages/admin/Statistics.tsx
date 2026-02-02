import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, MessageSquare } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const Statistics = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-statistics'],
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

      const growthRate = previous7DaysPosts > 0
        ? Math.round(((last7DaysPosts - previous7DaysPosts) / previous7DaysPosts) * 100)
        : 0;

      return {
        totalPosts30Days: recentPosts?.length || 0,
        totalMemorials30Days: recentMemorials?.length || 0,
        totalCandles,
        totalFlowers,
        growthRate,
        dailyStats: Object.entries(dailyStats)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-14) // Last 14 days
          .map(([date, data]) => ({
            date: format(new Date(date), 'dd MMM', { locale: fr }),
            ...data,
          })),
      };
    },
  });

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
          {stats?.growthRate !== undefined && (
            <p className="text-sm text-muted-foreground mb-4">
              Croissance hebdomadaire :{' '}
              <span className={stats.growthRate >= 0 ? 'text-green-500' : 'text-red-500'}>
                {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate}%
              </span>
            </p>
          )}
          
          <div className="h-48 flex items-end gap-1">
            {stats?.dailyStats.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-primary rounded-t"
                  style={{
                    height: `${Math.max((day.posts / (Math.max(...stats.dailyStats.map(d => d.posts)) || 1)) * 100, 4)}%`,
                    minHeight: day.posts > 0 ? '4px' : '2px',
                  }}
                  title={`${day.posts} message(s)`}
                />
                <span className="text-[10px] text-muted-foreground mt-2 rotate-45 origin-left">
                  {day.date}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Statistics;
