 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { format } from 'date-fns';
 import { fr } from 'date-fns/locale';
 import { Badge } from '@/components/ui/badge';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
 import { Loader2 } from 'lucide-react';
 import ExportCSVButton from './ExportCSVButton';
 
interface TransactionWithDetails {
   id: string;
   user_id: string;
   amount: number;
   currency: string;
   payment_type: string;
   status: string;
   ebilling_reference: string | null;
   memorial_id: string | null;
   metadata: Record<string, unknown> | null;
   created_at: string;
  memorial_name?: string;
 }
 
 const statusVariant = (status: string) => {
   switch (status) {
     case 'completed':
       return 'default';
     case 'pending':
       return 'secondary';
     case 'failed':
       return 'destructive';
     default:
       return 'outline';
   }
 };
 
 const statusLabel = (status: string) => {
   switch (status) {
     case 'completed':
       return 'Validé';
     case 'pending':
       return 'En attente';
     case 'failed':
       return 'Échoué';
     default:
       return status;
   }
 };
 
 const paymentTypeLabel = (type: string) => {
   switch (type) {
     case 'tribute':
       return 'Hommage';
     case 'memorial_creation':
       return 'Création mémorial';
     default:
       return type;
   }
 };
 
 const TransactionsTable = () => {
   const { data: transactions, isLoading } = useQuery({
     queryKey: ['admin-transactions-list'],
     queryFn: async () => {
      // Fetch transactions
      const { data: txData, error: txError } = await supabase
         .from('payment_transactions')
         .select('*')
         .order('created_at', { ascending: false })
         .limit(100);
 
      if (txError) throw txError;

      // Fetch memorial names for transactions with memorial_id
      const memorialIds = [...new Set((txData || []).filter(tx => tx.memorial_id).map(tx => tx.memorial_id))];
      
      let memorialMap: Record<string, string> = {};
      if (memorialIds.length > 0) {
        const { data: memorials } = await supabase
          .from('memorials')
          .select('id, first_name, last_name')
          .in('id', memorialIds);
        
        if (memorials) {
          memorialMap = memorials.reduce((acc, m) => {
            acc[m.id] = `${m.first_name} ${m.last_name}`;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Combine data
      return (txData || []).map(tx => ({
        ...tx,
        memorial_name: tx.memorial_id ? memorialMap[tx.memorial_id] : undefined,
      })) as TransactionWithDetails[];
     },
   });
 
   const fetchAllTransactions = async () => {
    const { data: txData, error: txError } = await supabase
       .from('payment_transactions')
       .select('*')
       .order('created_at', { ascending: false });
 
    if (txError) throw txError;

    const memorialIds = [...new Set((txData || []).filter(tx => tx.memorial_id).map(tx => tx.memorial_id))];
    
    let memorialMap: Record<string, string> = {};
    if (memorialIds.length > 0) {
      const { data: memorials } = await supabase
        .from('memorials')
        .select('id, first_name, last_name')
        .in('id', memorialIds);
      
      if (memorials) {
        memorialMap = memorials.reduce((acc, m) => {
          acc[m.id] = `${m.first_name} ${m.last_name}`;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    return (txData || []).map((tx) => ({
       ...tx,
       created_at: format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }),
       payment_type: paymentTypeLabel(tx.payment_type),
       status: statusLabel(tx.status),
      memorial_name: tx.memorial_id ? memorialMap[tx.memorial_id] || '—' : '—',
      author_name: tx.metadata && typeof tx.metadata === 'object' 
        ? String((tx.metadata as Record<string, unknown>).authorName || '—') 
        : '—',
     }));
   };
 
   const csvColumns = [
     { key: 'created_at' as const, label: 'Date' },
     { key: 'payment_type' as const, label: 'Type' },
    { key: 'memorial_name' as const, label: 'Défunt' },
    { key: 'author_name' as const, label: 'Auteur' },
     { key: 'amount' as const, label: 'Montant' },
     { key: 'currency' as const, label: 'Devise' },
     { key: 'status' as const, label: 'Statut' },
     { key: 'ebilling_reference' as const, label: 'Référence' },
   ];
 
   if (isLoading) {
     return (
       <Card>
         <CardContent className="flex items-center justify-center py-12">
           <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
         </CardContent>
       </Card>
     );
   }
 
   return (
     <Card>
       <CardHeader className="flex flex-row items-center justify-between">
         <CardTitle>Historique des transactions</CardTitle>
         <ExportCSVButton
           fetchData={fetchAllTransactions}
           columns={csvColumns}
           filename={`transactions-${format(new Date(), 'yyyy-MM-dd')}`}
           label="Exporter"
         />
       </CardHeader>
       <CardContent>
         {transactions && transactions.length > 0 ? (
           <div className="overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Date</TableHead>
                   <TableHead>Type</TableHead>
                    <TableHead>Défunt</TableHead>
                    <TableHead>Auteur</TableHead>
                   <TableHead>Détails</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {transactions.map((tx) => (
                   <TableRow key={tx.id}>
                     <TableCell className="whitespace-nowrap">
                       {format(new Date(tx.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                     </TableCell>
                     <TableCell>
                       <Badge variant="outline">{paymentTypeLabel(tx.payment_type)}</Badge>
                     </TableCell>
                      <TableCell className="font-medium">
                        {tx.memorial_name || '—'}
                      </TableCell>
                      <TableCell>
                        {tx.metadata && typeof tx.metadata === 'object'
                          ? String((tx.metadata as Record<string, unknown>).authorName || '—')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {tx.metadata && typeof tx.metadata === 'object'
                          ? String((tx.metadata as Record<string, unknown>).relationCategory || '—')
                          : '—'}
                      </TableCell>
                     <TableCell className="font-medium">
                       {tx.amount.toLocaleString()} {tx.currency}
                     </TableCell>
                     <TableCell>
                       <Badge variant={statusVariant(tx.status)}>
                         {statusLabel(tx.status)}
                       </Badge>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </div>
         ) : (
           <p className="text-muted-foreground text-sm text-center py-8">
             Aucune transaction enregistrée.
           </p>
         )}
       </CardContent>
     </Card>
   );
 };
 
 export default TransactionsTable;