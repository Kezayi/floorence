import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Flame, Flower2 } from 'lucide-react';
 import { subDays } from 'date-fns';
 import TransactionsTable from '@/components/admin/TransactionsTable';

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
        .order('created_at', { ascending: false });

      // Get transactions from last 30 days
      const recentTransactions = transactions?.filter(
        (t) => new Date(t.created_at) >= last30Days
      ) || [];

       // Only count completed for revenue
       const completedTransactions = transactions?.filter(t => t.status === 'completed') || [];
       const recentCompleted = recentTransactions.filter(t => t.status === 'completed');
 
      // Calculate totals
       const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
       const last30DaysRevenue = recentCompleted.reduce((sum, t) => sum + t.amount, 0);

      // Group by payment type
      const byType: Record<string, { count: number; amount: number }> = {};
       completedTransactions.forEach((t) => {
        if (!byType[t.payment_type]) {
          byType[t.payment_type] = { count: 0, amount: 0 };
        }
        byType[t.payment_type].count++;
        byType[t.payment_type].amount += t.amount;
      });

       // Count pending transactions
       const pendingCount = transactions?.filter(t => t.status === 'pending').length || 0;
       const pendingAmount = transactions?.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0) || 0;
 
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
         pendingCount,
         pendingAmount,
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

         <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
               Transactions en attente
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-amber-600">
               {revenueData?.pendingCount || 0} en attente
            </div>
            <p className="text-xs text-muted-foreground">
               {(revenueData?.pendingAmount || 0).toLocaleString()} FCFA potentiel
            </p>
          </CardContent>
        </Card>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        <Card>
          <CardHeader>
             <CardTitle className="text-sm font-medium text-muted-foreground">
               Répartition (validées)
             </CardTitle>
          </CardHeader>
          <CardContent>
             {revenueData?.byType && Object.keys(revenueData.byType).length > 0 ? (
               <div className="space-y-2">
                 {Object.entries(revenueData.byType).map(([type, data]) => (
                   <div key={type} className="flex items-center justify-between text-sm">
                     <span className="text-muted-foreground">
                       {type === 'tribute' ? 'Hommages' : type}
                      </span>
                     <span className="font-medium">{data.count}</span>
                  </div>
                ))}
              </div>
            ) : (
               <p className="text-muted-foreground text-xs">—</p>
            )}
          </CardContent>
        </Card>
      </div>

       <TransactionsTable />
    </div>
  );
};

export default Revenue;
