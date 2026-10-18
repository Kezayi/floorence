import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ADMIN_PREFIX as P } from '@/lib/adminRoutes';
import type { DashboardStats } from '@/hooks/useDashboardStats';

const CACHE = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 };
export const STALE_PENDING_MS = 30 * 60 * 1000;
const fmt = (n: number) => n.toLocaleString('fr-FR');

/** BO-02 — lectures seules, mêmes tables et statuts que les écrans spécialisés. */
const useOpsCounts = () =>
  useQuery({
    queryKey: ['bo02-ops-counts'],
    ...CACHE,
    queryFn: async () => {
      const head = { count: 'exact' as const, head: true };
      // Floorence n'a pas de table de signalements : seul l'état « masqué » est observable.
      const [unpub, hidden, sugg] = await Promise.all([
        supabase.from('memorials').select('id', head).eq('is_published', false).is('deleted_at', null).is('merged_into', null),
        supabase.from('guestbook_posts').select('id', head).eq('is_hidden', true).is('deleted_at', null),
        supabase.from('suggested_links').select('id', head).eq('status', 'pending'),
      ]);
      return { unpublished: unpub.count ?? 0, hidden: hidden.count ?? 0, suggestions: sugg.count ?? 0 };
    },
  });

const useFinanceCounts = (enabled: boolean) =>
  useQuery({
    queryKey: ['bo02-finance-counts'],
    enabled,
    ...CACHE,
    queryFn: async () => {
      const { data, error } = await supabase.from('payment_transactions').select('status, amount, created_at');
      if (error) throw error;
      const by = (s: string[]) => (data || []).filter((t) => s.includes(t.status));
      const sum = (r: { amount: number }[]) => r.reduce((a, t) => a + (t.amount || 0), 0);
      const ok = by(['success']), pend = by(['pending']);
      // Seuil G1-FIX9 : une tentative pending au-delà de 30 min n'est plus un délai normal → vérification admin.
      const staleCut = Date.now() - STALE_PENDING_MS;
      const stale = pend.filter((t) => new Date(t.created_at).getTime() < staleCut);
      return {
        initiated: data?.length ?? 0,
        confirmed: ok.length, confirmedAmount: sum(ok),
        pending: pend.length, pendingAmount: sum(pend),
        stalePending: stale.length,
        failed: by(['failed']).length,
        timedOut: by(['timeout', 'expired']).length,
      };
    },
  });

const Tile = ({ label, value, hint, to, tone }: { label: string; value: string; hint?: string; to?: string; tone?: 'alert' }) => {
  const body = (
    <div className="h-full rounded-lg border border-champagne/30 bg-ivory p-4 transition-colors group-hover:border-champagne">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-serif text-3xl ${tone === 'alert' ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {to && <span className="mt-2 inline-flex items-center gap-1 text-xs text-foreground/80 group-hover:text-foreground">Traiter <ArrowRight className="w-3 h-3" aria-hidden /></span>}
    </div>
  );
  return to ? <Link to={to} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne rounded-lg">{body}</Link> : body;
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8" aria-label={title}>
    <h2 className="font-serif text-xl text-foreground mb-3 pb-1 border-b border-champagne/30">{title}</h2>
    {children}
  </section>
);

const BusinessCockpit = ({ stats, isAdmin }: { stats: DashboardStats; isAdmin: boolean }) => {
  const { data: ops } = useOpsCounts();
  const { data: fin, isError: finErr } = useFinanceCounts(isAdmin);
  const delta = stats.postsLastWeek - stats.postsPrevWeek;
  const deltaTxt = stats.postsPrevWeek ? `${delta >= 0 ? '+' : ''}${Math.round((delta / stats.postsPrevWeek) * 100)} % vs semaine précédente` : `${stats.postsPrevWeek} la semaine précédente`;
  const dash = '—';

  return (
    <div>
      <Section title="À traiter">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Mémoriaux non publiés" value={ops ? fmt(ops.unpublished) : dash} hint="Brouillons ou en attente de paiement" to={`${P}/memoriaux`} />
          <Tile label="Hommages masqués" value={ops ? fmt(ops.hidden) : dash} hint="Déjà retirés de l'affichage · aucun signalement enregistré dans Floorence" to={`${P}/moderation`} />
          {isAdmin && <Tile label="Suggestions en attente" value={ops ? fmt(ops.suggestions) : dash} hint="Liens à valider ou rejeter" to={`${P}/audit-suggestions`} />}
          {isAdmin && <Tile label="Paiements à vérifier" value={fin ? fmt(fin.stalePending) : dash} hint={fin ? `En attente depuis plus de 30 min · hors ${fmt(fin.failed)} échecs et ${fmt(fin.timedOut)} délai expiré, sans action requise` : undefined} to={`${P}/finances`} tone={fin && fin.stalePending > 0 ? 'alert' : undefined} />}
        </div>
      </Section>

      <Section title="Activité des mémoriaux">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Mémoriaux enregistrés" value={fmt(stats.realMemorials)} hint={`${fmt(stats.demoMemorials)} de démonstration`} to={`${P}/memoriaux`} />
          <Tile label="Hommages visibles" value={fmt(stats.visiblePosts)} hint={`${fmt(stats.totalPosts)} au total`} to={`${P}/moderation`} />
          <Tile label="Hommages cette semaine" value={fmt(stats.postsLastWeek)} hint={deltaTxt} to={`${P}/statistiques`} />
          <Tile label="Comptes utilisateurs" value={fmt(stats.totalUsers)} to={isAdmin ? `${P}/utilisateurs` : undefined} />
        </div>
      </Section>

      {isAdmin && (
        <Section title="Transactions">
          {finErr ? (
            <p className="text-sm text-muted-foreground">Transactions indisponibles pour le moment.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Tile label="Initiées" value={fin ? fmt(fin.initiated) : dash} hint="Toutes tentatives confondues" to={`${P}/finances`} />
                <Tile label="En attente opérateur" value={fin ? fmt(fin.pending) : dash} hint={fin ? `${fmt(fin.pendingAmount)} XAF non confirmés` : undefined} to={`${P}/finances`} />
                <Tile label="Confirmées par l'opérateur" value={fin ? fmt(fin.confirmed) : dash} hint={fin ? `${fmt(fin.confirmedAmount)} XAF déclarés payés` : undefined} to={`${P}/finances`} />
                <Tile label="Encaissement établi" value="Non mesuré" hint="Aucun rapprochement bancaire disponible" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground max-w-3xl">
                « Confirmée » signifie que l'opérateur a déclaré le paiement réussi ; la prestation (publication, cierges, fleurs) est délivrée dans la même opération.
                Ce n'est pas une preuve de règlement bancaire : l'encaissement ne sera affiché qu'avec un relevé de rapprochement.
              </p>
            </>
          )}
        </Section>
      )}

      {isAdmin && (
        <div className="mb-8 flex justify-end">
          <Link to={`${P}/intelligence-sociale`} className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne rounded px-2 py-1">
            <Brain className="w-3.5 h-3.5" aria-hidden /> Enquêter sur une situation avec RAGet
          </Link>
        </div>
      )}
    </div>
  );
};

export default BusinessCockpit;
