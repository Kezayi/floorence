import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableRow, TableCell, TableHeader, TableHead } from '@/components/ui/table';
import { Check, EyeOff, RotateCcw, Trash2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { listReports, decideTribute, reportReasons, type GuestbookReport, type EditorialAction } from '@/lib/guestbookReports';
import { toast } from 'sonner';

export default function GuestbookReportsQueue() {
  const client = useQueryClient();
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  const [offset, setOffset] = useState(0);
  const [decision, setDecision] = useState<{ report: GuestbookReport; action: EditorialAction } | null>(null);
  const [reason, setReason] = useState('');
  const query = useQuery({ queryKey: ['admin-guestbook-reports', status, offset], queryFn: () => listReports(status, offset), refetchInterval: 30_000 });
  const mutation = useMutation({
    mutationFn: async () => { if (decision) await decideTribute(decision.report.post_id, decision.action, reason, decision.report.status === 'open' ? decision.report.id : undefined); },
    onSuccess: () => { setDecision(null); setReason(''); toast.success('Décision enregistrée.'); client.invalidateQueries({ queryKey: ['admin-guestbook-reports'] }); client.invalidateQueries({ queryKey: ['admin-guestbook-posts'] }); client.invalidateQueries({ queryKey: ['admin-guestbook-posts-count'] }); client.invalidateQueries({ queryKey: ['admin-trash'] }); },
    onError: (e) => { toast.error(e.message); client.invalidateQueries({ queryKey: ['admin-guestbook-reports'] }); },
  });
  const labels: Record<EditorialAction, string> = { maintain: 'Maintenir et clore', hide: 'Masquer', restore: 'Restaurer la visibilité éditoriale', trash: 'Placer dans la corbeille' };
  return <section className="mb-8 space-y-4" aria-labelledby="report-queue-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="report-queue-title" className="font-serif text-xl">Signalements à traiter <Badge variant="secondary">{query.data?.pending ?? '—'}</Badge></h2><div className="flex gap-2"><Button variant={status === 'open' ? 'secondary' : 'ghost'} size="sm" onClick={() => { setStatus('open'); setOffset(0); }}>À traiter</Button><Button variant={status === 'closed' ? 'secondary' : 'ghost'} size="sm" onClick={() => { setStatus('closed'); setOffset(0); }}>Traités</Button><Button variant="ghost" size="icon" aria-label="Actualiser les signalements" title="Actualiser les signalements" onClick={() => query.refetch()}><RefreshCw /></Button></div></div>
    {query.isError ? <p role="alert" className="text-sm text-destructive">{query.error.message}</p> : query.isLoading ? <p className="text-sm text-muted-foreground">Chargement des signalements…</p> : <div className="overflow-x-auto border rounded-md"><Table><TableHeader><TableRow><TableHead>Mémorial / hommage</TableHead><TableHead>Motif</TableHead><TableHead>Date / statut</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
      {query.data?.items.map((r) => <TableRow key={r.id}><TableCell className="min-w-48 max-w-80"><p className="font-medium">{r.memorial_name}</p><p className="text-xs text-muted-foreground">{r.author_name}</p><p className="text-sm whitespace-pre-wrap break-words mt-1">{r.content}</p></TableCell><TableCell className="min-w-48 max-w-72"><p>{reportReasons.find(([key]) => key === r.reason)?.[1] ?? r.reason}</p>{r.detail && <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{r.detail}</p>}<p className="text-xs text-muted-foreground mt-1">{r.report_history} signalement(s) dans l’historique</p></TableCell><TableCell className="min-w-36"><p className="text-xs">{new Date(r.created_at).toLocaleString('fr-FR')}</p><Badge variant="outline">{r.status === 'open' ? 'À traiter' : 'Clos'}</Badge>{r.decision && <p className="text-xs mt-1">{labels[r.decision as EditorialAction] ?? r.decision}</p>}{r.decision_reason && <p className="text-xs text-muted-foreground">{r.decision_reason}</p>}{r.is_hidden && <p className="text-xs text-muted-foreground">Visibilité financière verrouillée</p>}{r.deleted_at && <p className="text-xs text-muted-foreground">En corbeille</p>}</TableCell><TableCell><div className="flex gap-1">
        {(['maintain', 'hide', 'restore', 'trash'] as const).filter((a) => a === 'restore' ? r.editorial_hidden && !r.deleted_at : r.status === 'open' && (a === 'maintain' || !r.deleted_at)).map((a) => <Button key={a} variant="ghost" size="icon" title={labels[a]} aria-label={labels[a]} onClick={() => { setDecision({ report: r, action: a }); setReason(''); }}>{a === 'maintain' ? <Check /> : a === 'hide' ? <EyeOff /> : a === 'restore' ? <RotateCcw /> : <Trash2 />}</Button>)}
      </div></TableCell></TableRow>)}
      {!query.data?.items.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucun signalement {status === 'open' ? 'à traiter' : 'traité'}.</TableCell></TableRow>}
    </TableBody></Table></div>}
    {(query.data?.total ?? 0) > 20 && <div className="flex items-center justify-end gap-2"><Button variant="ghost" size="icon" aria-label="Signalements précédents" disabled={!offset} onClick={() => setOffset(offset - 20)}><ChevronLeft /></Button><span className="text-sm">{offset + 1}–{Math.min(offset + 20, query.data?.total ?? 0)} / {query.data?.total}</span><Button variant="ghost" size="icon" aria-label="Signalements suivants" disabled={offset + 20 >= (query.data?.total ?? 0)} onClick={() => setOffset(offset + 20)}><ChevronRight /></Button></div>}
    <Dialog open={!!decision} onOpenChange={(open) => { if (!open && !mutation.isPending) setDecision(null); }}><DialogContent><DialogHeader><DialogTitle>{decision ? labels[decision.action] : ''}</DialogTitle><DialogDescription>{decision?.action === 'restore' ? 'Cette décision ne débloque aucun paiement en attente.' : decision?.action === 'trash' ? 'L’hommage restera restaurable depuis la corbeille.' : 'La décision sera enregistrée dans le journal de modération.'}</DialogDescription></DialogHeader><Textarea aria-label="Motif de la décision" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} placeholder="Motif de la décision" /><DialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={() => setDecision(null)}>Annuler</Button><Button disabled={mutation.isPending || (!!decision && ['hide', 'trash'].includes(decision.action) && !reason.trim())} onClick={() => mutation.mutate()}>Confirmer</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}