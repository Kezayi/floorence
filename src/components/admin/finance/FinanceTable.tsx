import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { DollarSign, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  success: { label: 'Succès', variant: 'default' },
  pending: { label: 'En attente', variant: 'secondary' },
  failed: { label: 'Échoué', variant: 'destructive' },
  timeout: { label: 'Expiré', variant: 'outline' },
};

const PAGE_SIZE = 20;

interface Transaction {
  id: string | null;
  date_libreville: string | null;
  deceased_name: string | null;
  payer_phone: string | null;
  amount: number | null;
  candle_count: number | null;
  flower_count: number | null;
  status: string | null;
  ebilling_reference: string | null;
}

interface FinanceTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  page: number;
  onPageChange: (p: number) => void;
}

const FinanceTable = ({ transactions, isLoading, page, onPageChange }: FinanceTableProps) => {
  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const paginated = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Card className="bg-card shadow-sm border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Transactions ({transactions.length})</CardTitle>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span>{page + 1} / {totalPages}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : paginated.length === 0 ? (
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
                  <TableHead>Détail</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Réf.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(tx => {
                  const st = statusConfig[tx.status || 'pending'] || statusConfig.pending;
                  const items: string[] = [];
                  if (tx.candle_count) items.push(`${tx.candle_count} cierge${tx.candle_count > 1 ? 's' : ''}`);
                  if (tx.flower_count) items.push(`${tx.flower_count} fleur${tx.flower_count > 1 ? 's' : ''}`);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {tx.date_libreville ? format(new Date(tx.date_libreville), 'dd/MM/yyyy HH:mm', { locale: fr }) : '—'}
                      </TableCell>
                      <TableCell className="font-medium">{tx.deceased_name || 'Non renseigné'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tx.payer_phone || 'Non renseigné'}</TableCell>
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
  );
};

export default FinanceTable;
