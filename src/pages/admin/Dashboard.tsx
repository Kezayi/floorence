import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flower2, MessageSquare, DollarSign, Users } from 'lucide-react';

const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [memorialsRes, postsRes, transactionsRes] = await Promise.all([
        supabase.from('memorials').select('id', { count: 'exact', head: true }),
        supabase.from('guestbook_posts').select('id', { count: 'exact', head: true }),
        supabase.from('payment_transactions').select('amount, status'),
      ]);

      const totalRevenue = (transactionsRes.data || [])
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        memorials: memorialsRes.count || 0,
        posts: postsRes.count || 0,
        revenue: totalRevenue,
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
