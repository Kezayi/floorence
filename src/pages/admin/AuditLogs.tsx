import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AdminSearchHeader, { useAdminFilters } from '@/components/admin/AdminSearchHeader';
import { 
  History, 
  Shield, 
  ShieldCheck, 
  ShieldOff,
  Ban, 
  UserCheck,
  RefreshCw,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AuditLog {
  id: string;
  action_type: string;
  target_user_id: string | null;
  target_user_email: string | null;
  performed_by: string;
  performed_by_email: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const actionConfig: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline'; category: 'users' | 'settings' }> = {
  add_role: { label: 'Ajout de rôle', icon: <ShieldCheck className="w-3 h-3" />, variant: 'default', category: 'users' },
  remove_role: { label: 'Retrait de rôle', icon: <ShieldOff className="w-3 h-3" />, variant: 'secondary', category: 'users' },
  ban_user: { label: 'Blocage', icon: <Ban className="w-3 h-3" />, variant: 'destructive', category: 'users' },
  unban_user: { label: 'Déblocage', icon: <UserCheck className="w-3 h-3" />, variant: 'outline', category: 'users' },
  update_setting: { label: 'Modification paramètre', icon: <Settings className="w-3 h-3" />, variant: 'secondary', category: 'settings' },
};

const AuditLogs = () => {
  const { filters, updateFilter } = useAdminFilters();

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs'],
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always' as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter((log) => {
      // Action type filter
      if (filters.actionType !== 'all') {
        if (filters.actionType === 'users') {
          if (actionConfig[log.action_type]?.category !== 'users') return false;
        } else if (filters.actionType === 'settings') {
          if (actionConfig[log.action_type]?.category !== 'settings') return false;
        } else if (log.action_type !== filters.actionType) {
          return false;
        }
      }
      // Text search (debounced) — null-safe
      if (filters.debouncedSearch) {
        const q = filters.debouncedSearch.toLowerCase();
        if (
          !(log.target_user_email ?? '').toLowerCase().includes(q) &&
          !(log.performed_by_email ?? '').toLowerCase().includes(q) &&
          !(log.action_type ?? '').toLowerCase().includes(q)
        )
          return false;
      }
      // Date range
      if (filters.dateFrom && (log.created_at ?? '') < filters.dateFrom) return false;
      if (filters.dateTo && (log.created_at ?? '') > filters.dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [logs, filters.actionType, filters.debouncedSearch, filters.dateFrom, filters.dateTo]);

  const getActionDisplay = (actionType: string) => {
    return actionConfig[actionType] || { 
      label: actionType, 
      icon: <Shield className="w-3 h-3" />, 
      variant: 'secondary' as const,
      category: 'users' as const
    };
  };

  const formatDetails = (actionType: string, details: Record<string, unknown>) => {
    if (actionType === 'add_role' || actionType === 'remove_role') {
      const role = details.role as string;
      return role === 'admin' ? 'Administrateur' : 'Modérateur';
    }
    if (actionType === 'update_setting') {
      const label = details.setting_label as string;
      const oldValue = details.old_value as { amount?: number; enabled?: boolean; url?: string } | null;
      const newValue = details.new_value as { amount?: number; enabled?: boolean; url?: string };
      
      if (newValue?.amount !== undefined) {
        const oldAmount = oldValue?.amount ?? '—';
        return `${label}: ${oldAmount} → ${newValue.amount} FCFA`;
      }
      if (newValue?.enabled !== undefined) {
        return `${label}: ${newValue.enabled ? 'Activé' : 'Désactivé'}`;
      }
      return label;
    }
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Historique des actions</h1>
          <p className="text-muted-foreground mt-1">
            Journal des actions administratives
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <AdminSearchHeader
        placeholder="Rechercher par email ou action…"
        showActionType
        showDateRange
        filters={filters}
        onChange={(f) => {
          Object.entries(f).forEach(([k, v]) => {
            if (filters[k as keyof typeof filters] !== v) {
              updateFilter(k as keyof typeof filters, v);
            }
          });
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Actions récentes
          </CardTitle>
          <CardDescription>
            {filteredLogs.length} action(s) affichée(s) sur {logs?.length ?? 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="space-y-1 shrink-0">
                    <div className="h-4 w-20 bg-muted rounded" />
                    <div className="h-3 w-14 bg-muted rounded" />
                  </div>
                  <div className="h-6 w-24 bg-muted rounded-full" />
                  <div className="h-4 w-32 bg-muted rounded flex-1" />
                  <div className="h-4 w-28 bg-muted rounded" />
                  <div className="h-6 w-20 bg-muted rounded-full" />
                </div>
              ))}
            </div>
          ) : !filteredLogs || filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune action enregistrée
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Utilisateur ciblé</TableHead>
                  <TableHead>Effectuée par</TableHead>
                  <TableHead>Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const actionDisplay = getActionDisplay(log.action_type);
                  const details = formatDetails(log.action_type, log.details);
                  
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">
                          {format(new Date(log.created_at), 'dd MMM yyyy', { locale: fr })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'HH:mm:ss', { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionDisplay.variant} className="gap-1">
                          {actionDisplay.icon}
                          {actionDisplay.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{log.target_user_email || '—'}</div>
                        {log.target_user_id && (
                          <code className="text-xs text-muted-foreground">
                            {log.target_user_id.slice(0, 8)}...
                          </code>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{log.performed_by_email || '—'}</div>
                        <code className="text-xs text-muted-foreground">
                          {log.performed_by.slice(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        {details ? (
                          <Badge variant="outline">{details}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;
