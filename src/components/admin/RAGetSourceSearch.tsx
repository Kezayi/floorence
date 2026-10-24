import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * RAGet 2.0 — recherche hybride dans le corpus interne (FTS + trigrammes, RRF).
 * Lecture seule ; autorisation vérifiée côté serveur (rag_hybrid_search).
 * Couche vectorielle et génération : en attente du service d'inférence Floorence.
 */
type Hit = {
  chunk_id: string; source_type: string; memorial_name: string; memorial_slug: string;
  title: string | null; content: string; rrf_score: number;
  fts_rank: number | null; trgm_rank: number | null; vec_rank: number | null;
};

const TYPES: Record<string, string> = {
  memorial: "Identité", biography: "Biographie", tribute: "Hommage", event: "Événement", relation: "Relation",
};

export function RAGetSourceSearch() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ chunks: number; embedded: number } | null>(null);

  useEffect(() => {
    supabase.rpc("rag_index_stats").then(({ data }) => data && setStats(data as never));
  }, []);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setLoading(true); setError(null);
    const { data, error } = await supabase.rpc("rag_hybrid_search", {
      p_query: q.trim(), p_limit: 15, p_source_types: type ? [type] : undefined,
    });
    setLoading(false);
    if (error) { setError("Recherche impossible : accès refusé ou service indisponible."); setHits(null); return; }
    setHits((data ?? []) as Hit[]);
  };

  return (
    <section className="mb-10 rounded-lg border border-border/60 bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="font-serif text-lg text-foreground">Recherche dans les sources</h2>
        {stats && (
          <p className="text-[11px] text-muted-foreground">
            {stats.chunks} passages indexés · recherche lexicale (mots exacts puis mots significatifs et variantes orthographiques) · recherche sémantique inactive
          </p>
        )}
      </div>
      <form onSubmit={run} className="flex flex-wrap gap-2">
        <input
          value={q} onChange={(e) => setQ(e.target.value)} maxLength={200}
          placeholder="Nom, lieu, mot-clé…" aria-label="Recherche dans les sources"
          className="flex-1 min-w-[180px] rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type de source"
          className="rounded-md border border-border bg-background px-2 py-2 text-sm">
          <option value="">Toutes sources</option>
          {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Chercher
        </button>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {hits && hits.length === 0 && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Aucun passage pertinent dans les sources Floorence. Essayez un nom, un lieu ou deux ou trois mots clés.
        </p>
      )}
      {hits && hits.length > 0 && (
        <ol className="mt-4 space-y-3">
          {hits.map((h, i) => (
            <li key={h.chunk_id} className="rounded-md border border-border/50 p-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mb-1">
                <span className="font-medium text-foreground">[{i + 1}]</span>
                <FileText className="w-3 h-3" /> {TYPES[h.source_type] ?? h.source_type}
                <span>·</span>
                <Link to={`/memorial/${h.memorial_slug}`} className="underline text-foreground">{h.memorial_name}</Link>
                <span className="ml-auto">
                  {[h.fts_rank && "texte", h.trgm_rank && "variante", h.vec_rank && "sens"].filter(Boolean).join(" + ")}
                </span>
              </div>
              {h.title && <p className="text-xs font-medium text-foreground">{h.title}</p>}
              <p className="text-sm text-foreground/80 line-clamp-3">{h.content}</p>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground">
        Un rang de pertinence n'est jamais une preuve d'identité ou de parenté.
      </p>
    </section>
  );
}
