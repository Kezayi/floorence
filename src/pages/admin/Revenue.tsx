import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Flame, Flower2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const Revenue = () => {
  const { data: settings } = useSystemSettings();

  const { data: revenueData } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: async () => {
      const today = new Date();
      const last30Days = subDays(today, 30);

      // Get all completed transactions
      const { data: transactions } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      // Get transactions from last 30 days
      const recentTransactions = transactions?.filter(
        (t) => new Date(t.created_at) >= last30Days
      ) || [];

      // Calculate totals
      const totalRevenue = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const last30DaysRevenue = recentTransactions.reduce((sum, t) => sum + t.amount, 0);

      // Group by payment type
      const byType: Record<string, { count: number; amount: number }> = {};
      transactions?.forEach((t) => {
        if (!byType[t.payment_type]) {
          byType[t.payment_type] = { count: 0, amount: 0 };
        }
        byType[t.payment_type].count++;
        byType[t.payment_type].amount += t.amount;
      });

      // Calculate gestures from guestbook
      const { data: posts } = await supabase
        .from('guestbook_posts')
        .select('candle_count, flower_count');

      const totalCandles = posts?.reduce((sum, p) => sum + p.candle_count, 0) || 0;
      const totalFlowers = posts?.reduce((sum, p) => sum + p.flower_count, 0) || 0;

      return {
        totalRevenue,
        last30DaysRevenue,
        byType,
        recentTransactions: transactions?.slice(0, 10) || [],
        totalCandles,
        totalFlowers,
      };
    },
  });

  const candlePrice = settings?.candle_price.amount || 500;
  const flowerPrice = settings?.flower_price.amount || 1000;

  const projectedRevenue =
    (revenueData?.totalCandles || 0) * candlePrice +
    (revenueData?.totalFlowers || 0) * flowerPrice;

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-8">Chiffre d'affaires</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              CA Total
            </CardTitle>
            <DollarSign className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(revenueData?.totalRevenue || 0).toLocaleString()} FCFA
            </div>
            <p className="text-xs text-muted-foreground">Transactions validées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              CA (30 jours)
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(revenueData?.last30DaysRevenue || 0).toLocaleString()} FCFA
            </div>
            <p className="text-xs text-muted-foreground">Dernier mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cierges
            </CardTitle>
            <Flame className="w-5 h-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueData?.totalCandles || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {((revenueData?.totalCandles || 0) * candlePrice).toLocaleString()} FCFA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fleurs
            </CardTitle>
            <Flower2 className="w-5 h-5 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueData?.totalFlowers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {((revenueData?.totalFlowers || 0) * flowerPrice).toLocaleString()} FCFA
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par type</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData?.byType && Object.keys(revenueData.byType).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(revenueData.byType).map(([type, data]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{type}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({data.count} transaction{data.count > 1 ? 's' : ''})
                      </span>
                    </div>
                    <span className="font-medium">{data.amount.toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Aucune transaction enregistrée.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dernières transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData?.recentTransactions.length ? (
              <div className="space-y-3">
                {revenueData.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{tx.payment_type}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {format(new Date(tx.created_at), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tx.amount.toLocaleString()} FCFA</span>
                      <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Aucune transaction récente.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Revenue;
