import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { DollarSign, TrendingUp, CalendarDays, CheckCircle, Search, Download, FileText, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { exportToCSV } from '@/lib/csvExport';
import { sanitizeSearchInput } from '@/lib/sanitizeSearch';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';

const CACHE = { staleTime: 60_000, gcTime: 5 * 60_000 };

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  success: { label: 'Succès', variant: 'default' },
  pending: { label: 'En attente', variant: 'secondary' },
  failed: { label: 'Échoué', variant: 'destructive' },
  timeout: { label: 'Expiré', variant: 'outline' },
};

const Finance = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch all transactions from backoffice_finance_audit view
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['admin-finance-transactions'],
    ...CACHE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backoffice_finance_audit')
        .select('*')
        .order('date_libreville', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // KPIs computed from transactions
  const kpis = useMemo(() => {
    const completed = transactions.filter(t => t.status === 'success');
    const total = completed.reduce((s, t) => s + (t.amount || 0), 0);
    const today = completed.filter(t => t.date_libreville && isToday(new Date(t.date_libreville))).reduce((s, t) => s + (t.amount || 0), 0);
    const week = completed.filter(t => t.date_libreville && isThisWeek(new Date(t.date_libreville), { weekStartsOn: 1 })).reduce((s, t) => s + (t.amount || 0), 0);
    const month = completed.filter(t => t.date_libreville && isThisMonth(new Date(t.date_libreville))).reduce((s, t) => s + (t.amount || 0), 0);
    const successRate = transactions.length > 0 ? Math.round((completed.length / transactions.length) * 100) : 0;
    return { today, week, month, successRate };
  }, [transactions]);

  // Filtered transactions
  const filtered = useMemo(() => {
    if (!debouncedSearch) return transactions;
    const q = sanitizeSearchInput(debouncedSearch).toLowerCase();
    return transactions.filter(t =>
      (t.deceased_name ?? '').toLowerCase().includes(q) ||
      (t.payer_phone ?? '').toLowerCase().includes(q) ||
      (t.ebilling_reference ?? '').toLowerCase().includes(q)
    );
  }, [transactions, debouncedSearch]);

  // Chart data: daily revenue last 30 days
  const chartData = useMemo(() => {
    const completed = transactions.filter(t => t.status === 'success');
    const days: { date: string; label: string; ca: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const ca = completed
        .filter(t => {
          if (!t.date_libreville) return false;
          const d = new Date(t.date_libreville);
          return d >= dayStart && d <= dayEnd;
        })
        .reduce((s, t) => s + (t.amount || 0), 0);
      days.push({ date: format(date, 'yyyy-MM-dd'), label: format(date, 'dd MMM', { locale: fr }), ca });
    }
    return days;
  }, [transactions]);

  const hasChartData = chartData.some(d => d.ca > 0);

  // CSV Export
  const handleCSV = () => {
    if (filtered.length === 0) { toast.info('Aucune donnée à exporter'); return; }
    exportToCSV(filtered, [
      { key: 'date_libreville', label: 'Date (WAT)' },
      { key: 'deceased_name', label: 'Défunt' },
      { key: 'payer_phone', label: 'Téléphone' },
      { key: 'amount', label: 'Montant (XAF)' },
      { key: 'candle_count', label: 'Cierges' },
      { key: 'flower_count', label: 'Fleurs' },
      { key: 'status', label: 'Statut' },
      { key: 'ebilling_reference', label: 'Réf. eBilling' },
    ], 'transactions-floorence');
    toast.success(`${filtered.length} transactions exportées`);
  };

  // PDF (simple print)
  const handlePDF = () => {
    toast.info('Ouverture de l\'aperçu d\'impression...');
    setTimeout(() => window.print(), 300);
  };

  const kpiCards = [
    { title: "CA du jour", value: `${kpis.today.toLocaleString()} XAF`, icon: CalendarDays, color: 'text-[hsl(var(--tab-business))]' },
    { title: "CA de la semaine", value: `${kpis.week.toLocaleString()} XAF`, icon: TrendingUp, color: 'text-[hsl(var(--tab-business))]' },
    { title: "CA du mois", value: `${kpis.month.toLocaleString()} XAF`, icon: DollarSign, color: 'text-[hsl(var(--tab-business))]' },
    { title: "Taux de réussite", value: `${kpis.successRate}%`, icon: CheckCircle, color: kpis.successRate >= 70 ? 'text-emerald-500' : 'text-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Supervision Financière</h1>
          <p className="text-muted-foreground text-sm">Suivi des transactions et revenus en temps réel</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCSV}>
            <Download className="w-4 h-4 mr-2" />Télécharger CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePDF}>
            <FileText className="w-4 h-4 mr-2" />Rapport PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(kpi => (
          <Card key={kpi.title} className="bg-card shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom du défunt, téléphone ou réf..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Transactions Table */}
      <Card className="bg-card shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Transactions ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <DollarSign className="w-10 h-10 mx-auto opacity-20 mb-2" />
              <p className="text-sm font-medium">Aucune transaction trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date (WAT)</TableHead>
                    <TableHead>Défunt</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Objets</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Réf.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(tx => {
                    const st = statusConfig[tx.status || 'pending'] || statusConfig.pending;
                    const items: string[] = [];
                    if (tx.candle_count) items.push(`${tx.candle_count} cierge${tx.candle_count > 1 ? 's' : ''}`);
                    if (tx.flower_count) items.push(`${tx.flower_count} fleur${tx.flower_count > 1 ? 's' : ''}`);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {tx.date_libreville ? format(new Date(tx.date_libreville), 'dd/MM/yyyy HH:mm', { locale: fr }) : '—'}
                        </TableCell>
                        <TableCell className="font-medium">{tx.deceased_name || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{tx.payer_phone || '—'}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{(tx.amount || 0).toLocaleString()} XAF</TableCell>
                        <TableCell className="text-sm">{items.length > 0 ? items.join(' + ') : '—'}</TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{tx.ebilling_reference?.slice(0, 12) || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      <Card className="bg-card shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[hsl(var(--tab-business))]" />
            CA quotidien (30 derniers jours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {hasChartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
                    formatter={(value: number) => [`${value.toLocaleString()} XAF`, 'CA']}
                  />
                  <Bar dataKey="ca" fill="hsl(var(--tab-business))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <DollarSign className="w-10 h-10 opacity-20" />
                <p className="text-sm font-medium">Aucune transaction complétée sur cette période</p>
                <p className="text-xs">Les données apparaîtront ici dès les premiers paiements réussis.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Finance;
