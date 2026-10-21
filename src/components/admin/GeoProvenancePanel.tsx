// GEO-01-FIX2 — Trois Terres en lecture seule, avec provenance exacte (accès admin via RLS existante).
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GEO_COLUMNS } from '@/hooks/useMemorialGeo';
import { BURIAL_STATUS_LABELS, countryName, normalizeGeo, type GeoLands } from '@/lib/geoLands';
import { compareGeo, type GeoFinding } from '@/lib/geoFusionComparator';

interface Row { id: string; first_name: string; last_name: string; merged_into: string | null; geo: GeoLands }

const val = (c: string | null, l: string | null) => [l, c ? `${countryName(c)} (${c})` : null].filter(Boolean).join(', ') || '—';

function GeoCard({ r, quality }: { r: Row; quality: 'Source' | 'Master' }) {
  return (
    <div className="rounded-md border border-border p-3 text-sm min-w-0 space-y-1">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{quality}</p>
      <p className="font-serif text-base">{r.first_name} {r.last_name}</p>
      <p className="text-xs text-muted-foreground break-all">memorials.id = {r.id}</p>
      <dl className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-0.5">
        <dt className="text-muted-foreground">Originelle</dt><dd className="break-words">{val(r.geo.origin_country, r.geo.origin_locality)}</dd>
        <dt className="text-muted-foreground">De vie</dt><dd className="break-words">{val(r.geo.residence_country, r.geo.residence_locality)}</dd>
        <dt className="text-muted-foreground">Finale</dt><dd className="break-words">{val(r.geo.burial_country, r.geo.burial_locality)}</dd>
        <dt className="text-muted-foreground">Statut</dt><dd>{r.geo.burial_status ? BURIAL_STATUS_LABELS[r.geo.burial_status] : '—'}</dd>
      </dl>
    </div>
  );
}

const TITLE: Record<GeoFinding['kind'], string> = {
  identical: 'Valeurs identiques', different: 'Valeurs différentes', missing: 'Informations manquantes', status_different: "Statuts d'inhumation différents",
};

function Findings({ list }: { list: GeoFinding[] }) {
  return (
    <>
      {(['identical', 'different', 'status_different', 'missing'] as const).map((k) => {
        const items = list.filter((f) => f.kind === k);
        if (!items.length) return null;
        return (
          <div key={k}>
            <p className="text-sm font-medium">{TITLE[k]}</p>
            <ul className="text-sm space-y-0.5">
              {items.map((f, i) => <li key={i}>{f.label} <span className="text-xs text-muted-foreground">— {f.source}</span></li>)}
            </ul>
          </div>
        );
      })}
    </>
  );
}

const SELECT = `id, first_name, last_name, merged_into, ${GEO_COLUMNS}`;
const toRow = (d: Record<string, unknown>): Row => ({ id: d.id as string, first_name: d.first_name as string, last_name: d.last_name as string, merged_into: (d.merged_into as string) ?? null, geo: normalizeGeo(d) });

/** Mode paire (avant fusion) : sourceId + masterId. Mode Master (après fusion) : masterId seul → sources rattachées via merged_into. */
export default function GeoProvenancePanel({ masterId, sourceId }: { masterId: string; sourceId?: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['geo-provenance', masterId, sourceId ?? 'attached'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: m, error } = await supabase.from('memorials').select(SELECT).eq('id', masterId).maybeSingle();
      if (error) throw error;
      const q = supabase.from('memorials').select(SELECT);
      const { data: s, error: e2 } = sourceId ? await q.eq('id', sourceId) : await q.eq('merged_into', masterId).limit(50);
      if (e2) throw e2;
      return { master: m ? toRow(m as Record<string, unknown>) : null, sources: (s ?? []).map((x) => toRow(x as Record<string, unknown>)) };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground" role="status">Chargement des Trois Terres…</p>;
  if (isError || !data?.master) return <p className="text-sm text-destructive">Trois Terres indisponibles (accès refusé ou mémorial introuvable).</p>;
  if (!sourceId && data.sources.length === 0) return null;

  return (
    <section aria-label="Trois Terres — provenance" className="mt-4 space-y-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        Trois Terres · {sourceId ? 'comparaison avant fusion' : `${data.sources.length} mémorial(aux) rattaché(s) — lecture seule`}
      </p>
      {data.sources.map((s) => (
        <div key={s.id} className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GeoCard r={s} quality="Source" />
            <GeoCard r={data.master!} quality="Master" />
          </div>
          <Findings list={compareGeo(s.geo, data.master!.geo)} />
        </div>
      ))}
      <p className="text-xs text-muted-foreground border-t border-border pt-2">
        Faits observables uniquement. Une différence peut refléter des périodes de vie ou des déclarations familiales distinctes ; aucune valeur n'est recopiée ni résolue automatiquement. Historique des modifications : Journal d'audit (memorial_geo).
      </p>
    </section>
  );
}
