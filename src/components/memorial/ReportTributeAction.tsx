import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flag, MoreHorizontal, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { reportReasons, reportTribute, type ReportReason } from '@/lib/guestbookReports';
import { toast } from 'sonner';

export default function ReportTributeAction({ postId, hidden = false }: { postId: string; hidden?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [detail, setDetail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  if (hidden || !/^[0-9a-f-]{36}$/i.test(postId)) return null;
  const submit = async () => {
    if (!user || !reason || sending) return;
    setSending(true); setError('');
    try {
      const result = await reportTribute(postId, reason, detail);
      setSent(true); setOpen(false);
      toast.success(result.duplicate ? 'Votre signalement est déjà en cours de traitement.' : 'Votre signalement a été transmis à la modération.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur lors du signalement.'); }
    finally { setSending(false); }
  };
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-livreor-muted" aria-label="Options de cet hommage" title="Options de cet hommage"><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end"><DropdownMenuItem disabled={sent} onSelect={() => setOpen(true)}><Flag className="mr-2 h-4 w-4" />{sent ? 'Signalement transmis' : 'Signaler cet hommage'}</DropdownMenuItem></DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={open} onOpenChange={(value) => { if (!sending) setOpen(value); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Signaler cet hommage</DialogTitle><DialogDescription>Votre identité et votre signalement ne seront pas affichés publiquement.</DialogDescription></DialogHeader>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-label="Chargement" /> : !user ? <>
          <p className="text-sm text-muted-foreground">Connectez-vous pour transmettre votre signalement.</p>
          <Button asChild><Link to={`/auth?redirect=${encodeURIComponent(location.pathname)}`}>Se connecter</Link></Button>
        </> : <>
          <div className="space-y-2"><Label htmlFor={`report-reason-${postId}`}>Motif</Label><Select value={reason} onValueChange={(value) => { const match = reportReasons.find(([key]) => key === value); if (match) setReason(match[0]); }}><SelectTrigger id={`report-reason-${postId}`}><SelectValue placeholder="Choisir un motif" /></SelectTrigger><SelectContent>{reportReasons.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor={`report-detail-${postId}`}>Précision (facultative)</Label><Textarea id={`report-detail-${postId}`} value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={2000} rows={4} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>Annuler</Button><Button onClick={submit} disabled={!reason || sending} className="disabled:opacity-60">{sending && <Loader2 className="h-4 w-4 animate-spin" />}Envoyer le signalement</Button></DialogFooter>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}