import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Flower2, MessageSquare } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DashboardStats } from '@/hooks/useDashboardStats';

interface DailyRevenue {
  date: string;
  revenue: number;
  label: string;
}

const CACHE_CONFIG = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 };

interface Props {
  stats: DashboardStats;
}

const TabBusiness = ({ stats }: Props) => {
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

  const hasRevenue = revenueData && revenueData.some(d => d.revenue > 0);
  const maxRevenue = revenueData ? Math.max(...revenueData.map(d => d.revenue), 1) : 1;
  const yAxisMax = Math.ceil(maxRevenue * 1.1 / 1000) * 1000 || 10000;

  const statCards = [
    { title: 'Utilisateurs', value: stats.totalUsers, icon: Users, color: 'text-muted-foreground' },
    { title: 'Espaces mémoriels', value: stats.totalMemorials, icon: Flower2, color: 'text-[hsl(45,90%,50%)]', sub: `${stats.realMemorials} réels · ${stats.demoMemorials} démo` },
    { title: 'Hommages visibles', value: stats.visiblePosts, icon: MessageSquare, color: 'text-muted-foreground', sub: `${stats.postsLastWeek} cette semaine` },
    { title: 'Chiffre d\'affaires', value: `${stats.totalRevenue.toLocaleString()} XAF`, icon: DollarSign, color: 'text-[hsl(45,90%,50%)]' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Revenue Chart */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[hsl(45,90%,50%)]" />
            Évolution du chiffre d'affaires (30 derniers jours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {hasRevenue ? (
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
                    domain={[0, yAxisMax]}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} XAF`, 'Revenus']}
                    labelFormatter={(label) => label}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(45, 90%, 50%)"
                    fill="hsl(45, 90%, 50%, 0.15)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <DollarSign className="w-10 h-10 opacity-20" />
                <p className="text-sm font-medium">Phase Bêta : Simulations de transactions en cours</p>
                <p className="text-xs">Les données de revenus apparaîtront ici dès les premiers paiements.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TabBusiness;
