import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flower2, MessageSquare, DollarSign, Users, Trophy, Flame } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';

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

const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [memorialsRes, postsRes, transactionsRes, profilesRes] = await Promise.all([
        supabase.from('memorials').select('id', { count: 'exact', head: true }),
        supabase.from('guestbook_posts').select('id', { count: 'exact', head: true }),
        supabase.from('payment_transactions').select('amount, status, created_at'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      const completedTransactions = (transactionsRes.data || [])
        .filter(t => t.status === 'completed');

      const totalRevenue = completedTransactions
        .reduce((sum, t) => sum + t.amount, 0);

      // Group by day for the chart (last 30 days)
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

      return {
        memorials: memorialsRes.count || 0,
        posts: postsRes.count || 0,
        revenue: totalRevenue,
        dailyRevenue: last30Days,
        totalUsers: profilesRes.count || 0,
      };
    },
  });

  // Fetch memorial rankings with post counts and gestures
  const { data: rankings } = useQuery({
    queryKey: ['admin-memorial-rankings'],
    queryFn: async () => {
      // Get all memorials
      const { data: memorials } = await supabase
        .from('memorials')
        .select('id, slug, first_name, last_name')
        .eq('is_active', true);

      if (!memorials || memorials.length === 0) return [];

      // Get all guestbook posts with counts
      const { data: posts } = await supabase
        .from('guestbook_posts')
        .select('memorial_id, candle_count, flower_count');

      // Aggregate by memorial
      const memorialStats: Record<string, { postCount: number; candles: number; flowers: number }> = {};
      
      (posts || []).forEach(post => {
        if (!memorialStats[post.memorial_id]) {
          memorialStats[post.memorial_id] = { postCount: 0, candles: 0, flowers: 0 };
        }
        memorialStats[post.memorial_id].postCount++;
        memorialStats[post.memorial_id].candles += post.candle_count || 0;
        memorialStats[post.memorial_id].flowers += post.flower_count || 0;
      });

      // Map and sort by total interactions
      const rankings: MemorialRanking[] = memorials.map(m => {
        const stats = memorialStats[m.id] || { postCount: 0, candles: 0, flowers: 0 };
        return {
          id: m.id,
          slug: m.slug,
          firstName: m.first_name,
          lastName: m.last_name,
          postCount: stats.postCount,
          totalCandles: stats.candles,
          totalFlowers: stats.flowers,
          totalInteractions: stats.postCount + stats.candles + stats.flowers,
        };
      });

      // Sort by total interactions descending
      rankings.sort((a, b) => b.totalInteractions - a.totalInteractions);

      return rankings.slice(0, 10); // Top 10
    },
  });

  const statCards = [
    {
      title: 'Comptes utilisateurs',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-purple-500',
    },
    {
      title: 'Espaces mémoriels',
      value: stats?.memorials || 0,
      icon: Flower2,
      color: 'text-primary',
    },
    {
      title: 'Messages d\'hommage',
      value: stats?.posts || 0,
      icon: MessageSquare,
      color: 'text-blue-500',
    },
    {
      title: 'Chiffre d\'affaires',
      value: `${(stats?.revenue || 0).toLocaleString()} FCFA`,
      icon: DollarSign,
      color: 'text-green-500',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-8">Tableau de bord</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Memorial Rankings */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
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
                      index === 0 ? 'bg-yellow-500 text-yellow-950' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-amber-600 text-amber-950' :
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
                          {memorial.postCount} messages
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {memorial.totalCandles} cierges
                        </span>
                        <span className="flex items-center gap-1">
                          <Flower2 className="w-3 h-3" />
                          {memorial.totalFlowers} fleurs
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
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Évolution du chiffre d'affaires (30 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {stats?.dailyRevenue && stats.dailyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.dailyRevenue}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Les dernières activités de la plateforme apparaîtront ici.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertes de modération</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Aucune alerte en attente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
