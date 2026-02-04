import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flower2, MessageSquare, DollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DailyRevenue {
  date: string;
  revenue: number;
  label: string;
}

const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [memorialsRes, postsRes, transactionsRes] = await Promise.all([
        supabase.from('memorials').select('id', { count: 'exact', head: true }),
        supabase.from('guestbook_posts').select('id', { count: 'exact', head: true }),
        supabase.from('payment_transactions').select('amount, status, created_at'),
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
      };
    },
  });

  const statCards = [
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

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
