import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ADMIN_PREFIX } from '@/lib/adminRoutes';
import { compareFusion, type FusionRelation, type FusionSubject, type Finding } from '@/lib/ragetFusionComparator';
import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

const FIELDS = 'id, slug, first_name, last_name, birth_date, death_date, biography';

async function loadSubject(id: string): Promise<FusionSubject | null> {
  const { data, error } = await supabase.from('memorials').select(FIELDS).eq('id', id).is('deleted_at', null).maybeSingle();
  if (error) throw error;
  return data as FusionSubject | null;
}

async function loadRelations(id: string): Promise<FusionRelation[]> {
  const { data, error } = await supabase
    .from('memorial_relations')
    .select('memorial_id_1, memorial_id_2, relation_type, status')
    .or(`memorial_id_1.eq.${id},memorial_id_2.eq.${id}`)
    .neq('status', 'rejected')
    .limit(200);
  if (error) throw error;
  const others = [...new Set((data ?? []).map((r) => (r.memorial_id_1 === id ? r.memorial_id_2 : r.memorial_id_1)).filter(Boolean) as string[])];
  const names: Record<string, string> = {};
  if (others.length) {
    const { data: ms } = await supabase.from('memorials').select('id, first_name, last_name').in('id', others).is('deleted_at', null);
    (ms ?? []).forEach((m) => { names[m.id] = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim(); });
  }
  return (data ?? [])
    .map((r) => {
      const other = (r.memorial_id_1 === id ? r.memorial_id_2 : r.memorial_id_1) as string;
      return { other_id: other, other_name: names[other] ?? '', relation: r.relation_type, status: r.status };
    })
    .filter((r) => r.other_id && names[r.other_id] !== undefined);
}

const ICON = { concordance: CheckCircle2, divergence: AlertTriangle, missing: HelpCircle };
const TITLE = { concordance: 'Concordances documentées', divergence: 'Divergences', missing: 'Informations manquantes' };

function Column({ role, s, rel }: { role: string; s: FusionSubject; rel: FusionRelation[] }) {
  return (
    <div className="rounded-md border border-border p-3 space-y-1 text-sm min-w-0">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{role}</p>
      <p className="font-serif text-base text-foreground">{s.first_name} {s.last_name}</p>
      <p className="text-muted-foreground">{s.birth_date?.slice(0, 10) ?? '—'} · {s.death_date?.slice(0, 10) ?? '—'}</p>
      <p className="text-muted-foreground line-clamp-3">{s.biography?.trim() || 'Biographie absente'}</p>
      <p className="text-xs text-muted-foreground">{rel.length} relation(s) enregistrée(s)</p>
      {s.slug && (
        <a className="text-xs underline text-primary" href={`${ADMIN_PREFIX}/memorials/${s.id}`} target="_blank" rel="noreferrer">Consulter la fiche source</a>
      )}
    </div>
  );
}

export default function RAGetFusionAssistant({ sourceId, targetId }: { sourceId: string; targetId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['raget-fusion', sourceId, targetId],
    staleTime: 60_000,
    queryFn: async () => {
      const [a, b, ra, rb] = await Promise.all([loadSubject(sourceId), loadSubject(targetId), loadRelations(sourceId), loadRelations(targetId)]);
      return { a, b, ra, rb };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground" role="status">RAGet prépare le dossier comparatif…</p>;
  if (isError || !data?.a || !data?.b) return <p className="text-sm text-destructive">Analyse RAGet indisponible pour cette paire.</p>;

  const findings = compareFusion(data.a, data.b, data.ra, data.rb);
  const groups = (['concordance', 'divergence', 'missing'] as const).map((k) => [k, findings.filter((f) => f.kind === k)] as [Finding['kind'], Finding[]]);

  return (
    <section aria-label="Analyse préalable à la fusion" className="mt-4 space-y-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">RAGet · Analyse préalable à la fusion</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Column role="Source" s={data.a} rel={data.ra} />
        <Column role="Cible" s={data.b} rel={data.rb} />
      </div>
      {groups.map(([k, list]) => list.length > 0 && (
        <div key={k}>
          <p className="text-sm font-medium text-foreground mb-1">{TITLE[k]}</p>
          <ul className="space-y-1">
            {list.map((f, i) => {
              const Icon = ICON[k];
              return (
                <li key={i} className="flex gap-2 text-sm text-foreground">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${k === 'divergence' ? 'text-destructive' : 'text-muted-foreground'}`} aria-hidden />
                  <span>{f.label} <span className="text-xs text-muted-foreground">— source : {f.source}</span></span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="text-xs text-muted-foreground border-t border-border pt-2">
        Avis consultatif. RAGet prépare le dossier ; l’administrateur décide. Aucun rapprochement ne vaut confirmation d’identité ni ne remplace la confirmation familiale.
      </p>
    </section>
  );
}
