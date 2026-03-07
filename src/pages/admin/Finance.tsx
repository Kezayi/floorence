import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isToday, isThisWeek, isThisMonth, subHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { exportToCSV } from '@/lib/csvExport';
import { sanitizeSearchInput } from '@/lib/sanitizeSearch';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import FinanceKPIs from '@/components/admin/finance/FinanceKPIs';
import FinanceFilters from '@/components/admin/finance/FinanceFilters';
import FinanceTable from '@/components/admin/finance/FinanceTable';
import FinanceChart from '@/components/admin/finance/FinanceChart';

const CACHE = { staleTime: 60_000, gcTime: 5 * 60_000 };

const Finance = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebounce(searchQuery, 300);

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

  // KPIs
  const kpis = useMemo(() => {
    const completed = transactions.filter(t => t.status === 'success');
    const today = completed.filter(t => t.date_libreville && isToday(new Date(t.date_libreville))).reduce((s, t) => s + (t.amount || 0), 0);
    const week = completed.filter(t => t.date_libreville && isThisWeek(new Date(t.date_libreville), { weekStartsOn: 1 })).reduce((s, t) => s + (t.amount || 0), 0);
    const month = completed.filter(t => t.date_libreville && isThisMonth(new Date(t.date_libreville))).reduce((s, t) => s + (t.amount || 0), 0);
    const successRate = transactions.length > 0 ? Math.round((completed.length / transactions.length) * 100) : 0;
    return { today, week, month, successRate };
  }, [transactions]);

  // Filtered transactions (search + status + date range)
  const filtered = useMemo(() => {
    let result = transactions;

    // Text search
    if (debouncedSearch) {
      const q = sanitizeSearchInput(debouncedSearch).toLowerCase();
      result = result.filter(t =>
        (t.deceased_name_snapshot ?? '').toLowerCase().includes(q) ||
        (t.payer_phone ?? '').toLowerCase().includes(q) ||
        (t.ebilling_reference ?? '').toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }

    // Date range filter
    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      result = result.filter(t => {
        if (!t.date_libreville) return false;
        return new Date(t.date_libreville) >= from;
      });
    }
    if (dateRange?.to) {
      const to = endOfDay(dateRange.to);
      result = result.filter(t => {
        if (!t.date_libreville) return false;
        return new Date(t.date_libreville) <= to;
      });
    }

    return result;
  }, [transactions, debouncedSearch, statusFilter, dateRange]);

  // Reset page when filters change
  useMemo(() => { setPage(0); }, [debouncedSearch, statusFilter, dateRange]);

  // Chart data
  const chartData = useMemo(() => {
    const completed = transactions.filter(t => t.status === 'success');
    const days: { label: string; ca: number }[] = [];
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
      days.push({ label: format(date, 'dd MMM', { locale: fr }), ca });
    }
    return days;
  }, [transactions]);

  const handleCSV = () => {
    if (filtered.length === 0) { toast.info('Aucune donnée à exporter'); return; }
    exportToCSV(filtered, [
      { key: 'date_libreville', label: 'Date (WAT)' },
      { key: 'deceased_name_snapshot', label: 'Défunt' },
      { key: 'payer_phone', label: 'Téléphone' },
      { key: 'amount', label: 'Montant (XAF)' },
      { key: 'status', label: 'Statut' },
      { key: 'ebilling_reference', label: 'Réf. eBilling' },
    ], 'transactions-floorence');
    toast.success(`${filtered.length} transactions exportées`);
  };

  const handlePDF = () => {
    toast.info("Ouverture de l'aperçu d'impression...");
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Supervision Financière</h1>
          <p className="text-muted-foreground text-sm">Suivi des transactions et revenus en temps réel</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCSV}>
            <Download className="w-4 h-4 mr-2" />CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePDF}>
            <FileText className="w-4 h-4 mr-2" />PDF
          </Button>
        </div>
      </div>

      <FinanceKPIs {...kpis} />

      <FinanceFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <FinanceTable
        transactions={filtered}
        isLoading={isLoading}
        page={page}
        onPageChange={setPage}
      />

      <FinanceChart data={chartData} />
    </div>
  );
};

export default Finance;
