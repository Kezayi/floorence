import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Route } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchFamilyRelationGraph, type FamilyGraphMemorial } from "@/lib/resolvedGraphs";
import { buildVerifiedEdges, findRelationPaths, type RelationPath, type VerifiedRelationEdge } from "@/lib/relationPaths";
import Photo from "@/components/ui/Photo";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { displayName } from "@/lib/privacyUtils";

/**
 * RIBENGA-06 — Chemins relationnels non linéaires entre mémoriaux.
 * Fondé EXCLUSIVEMENT sur des liens déclarés et acceptés (identifiants canoniques),
 * jamais sur des noms ni sur des hypothèses calculées. Aucun appel IA.
 * Un chemin sans étayage suffisant n'est pas affiché comme tel : « chemin non étayé ».
 */

const MAX_DEPTH = 4;
const MAX_PATHS_PER_TARGET = 2;
const MAX_TARGETS = 6;

interface RelationPathsPanelProps {
  memorialId: string;
  deceasedName: string;
}

const pickMemorialPhoto = (m: FamilyGraphMemorial): string | null => {
  const idx = m.default_photo_index ?? 0;
  return m.photos?.[idx] ?? m.photos?.[0] ?? m.photo_url ?? null;
};

const memorialUrl = (m: FamilyGraphMemorial): string =>
  m.share_token ? `/m/${m.share_token}` : `/memorial/${m.slug}`;

const fullName = (m: FamilyGraphMemorial): string => `${m.first_name} ${m.last_name}`.trim();

const RelationPathsPanel = ({ memorialId, deceasedName }: RelationPathsPanelProps) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const graphQ = useQuery({
    queryKey: ["family-relation-graph", memorialId],
    queryFn: () => fetchFamilyRelationGraph(memorialId),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const edges = useMemo(
    () => buildVerifiedEdges(graphQ.data?.edges ?? []),
    [graphQ.data],
  );

  const allRelationIds = useMemo(
    () => Array.from(new Set(edges.flatMap((e) => e.relationIds))),
    [edges],
  );

  const countsQ = useQuery({
    queryKey: ["relation-confirmation-counts", allRelationIds],
    enabled: allRelationIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_relation_confirmation_counts", {
        p_relation_ids: allRelationIds,
      });
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of data || []) map.set(row.relation_id, Number(row.confirmations));
      return map;
    },
    staleTime: 60_000,
  });

  const edgeConfirmations = (e: VerifiedRelationEdge): number => {
    if (!countsQ.data) return 0;
    return e.relationIds.reduce((sum, id) => sum + (countsQ.data.get(id) ?? 0), 0);
  };

  const memorialById = useMemo(
    () => new Map((graphQ.data?.memorials ?? []).map((m) => [m.id, m])),
    [graphQ.data],
  );

  // Cibles = mémoriaux visibles atteignables par un chemin d'au moins 2 liens
  // (les liens directs relèvent déjà du Pont des Ancêtres).
  const targets = useMemo(() => {
    if (!graphQ.data) return [];
    const out: Array<{ memorial: FamilyGraphMemorial; paths: RelationPath[] }> = [];
    for (const m of graphQ.data.memorials) {
      if (m.id === memorialId) continue;
      const paths = findRelationPaths(edges, memorialId, m.id, {
        maxDepth: MAX_DEPTH,
        maxPaths: MAX_PATHS_PER_TARGET,
      }).filter((p) => p.steps.length >= 2);
      if (paths.length > 0) out.push({ memorial: m, paths });
      if (out.length >= MAX_TARGETS) break;
    }
    return out;
  }, [graphQ.data, edges, memorialId]);

  if (graphQ.isLoading) {
    return <Skeleton className="h-24 w-full rounded-sm" />;
  }
  // Erreur ou graphe insuffisant : on n'affiche rien plutôt qu'inventer.
  if (graphQ.isError || !graphQ.data || edges.length < 2) return null;

  const renderNode = (id: string) => {
    const m = memorialById.get(id);
    if (!m) return null; // jamais de nom/photo hors portée de la recherche existante
    const name = displayName(fullName(m), isAuthenticated);
    return (
      <Link
        to={memorialUrl(m)}
        className="flex items-center gap-2 group min-w-0"
        title={`Voir le mémorial de ${name}`}
      >
        <span className="w-8 h-8 shrink-0">
          <Photo
            src={pickMemorialPhoto(m)}
            alt={name}
            variant="node"
            fallbackName={fullName(m)}
            targetWidth={32}
            targetHeight={32}
            className="[&_span]:text-[10px] [&_span]:font-sans"
          />
        </span>
        <span className="font-serif text-sm text-foreground group-hover:text-primary transition-colors truncate">
          {name}
        </span>
      </Link>
    );
  };

  const renderEdge = (e: VerifiedRelationEdge, key: string) => {
    const confirmations = edgeConfirmations(e);
    return (
      <span key={key} className="flex items-center gap-1.5 min-w-0 flex-wrap">
        <span className="w-4 h-px bg-border shrink-0" aria-hidden="true" />
        <span className="text-xs font-sans text-muted-foreground">{e.label}</span>
        <span className="text-[10px] font-sans px-1.5 py-0.5 rounded-sm border border-border text-muted-foreground">
          Lien déclaré
        </span>
        {confirmations > 0 && (
          <span className="text-[10px] font-sans px-1.5 py-0.5 rounded-sm border border-ai-gold/30 bg-ai-gold/10 text-ai-gold-foreground">
            Confirmé par {confirmations} membre{confirmations > 1 ? "s" : ""}
          </span>
        )}
        <span className="w-4 h-px bg-border shrink-0" aria-hidden="true" />
      </span>
    );
  };

  const pathSentence = (p: RelationPath): string => {
    const parts: string[] = [];
    const first = memorialById.get(p.nodeIds[0]);
    if (first) parts.push(fullName(first));
    for (const step of p.steps) {
      const m = memorialById.get(step.toId);
      parts.push(`lien déclaré (${step.edge.label})`);
      if (m) parts.push(fullName(m));
    }
    return `Chemin : ${parts.join(" — ")}.`;
  };

  return (
    <div className="bg-muted/30 border border-border/60 p-5 rounded-sm">
      <div className="flex items-center gap-2 mb-1">
        <Route className="w-4 h-4 text-foreground/60" />
        <h4 className="font-serif text-lg">Chemins relationnels</h4>
      </div>
      <p className="text-xs text-muted-foreground font-sans mb-4">
        Parcours fondés uniquement sur des liens déclarés et acceptés entre mémoriaux —
        aucune hypothèse automatique.
      </p>

      {targets.length === 0 ? (
        <p className="text-sm text-muted-foreground font-serif italic">
          Chemin non étayé au-delà des liens directs pour {deceasedName}.
        </p>
      ) : (
        <div className="space-y-4">
          {targets.map(({ memorial, paths }) => (
            <div key={memorial.id} className="space-y-2">
              <p className="text-sm font-serif text-foreground">
                Vers {displayName(fullName(memorial), isAuthenticated)}
              </p>
              {paths.map((p, idx) => (
                <div key={p.nodeIds.join(">")} className="pl-2 border-l border-border/60">
                  {paths.length > 1 && (
                    <p className="text-[10px] font-sans text-muted-foreground mb-1">
                      Parcours {idx + 1} sur {paths.length}
                    </p>
                  )}
                  <ol
                    className="flex items-center gap-1.5 flex-wrap"
                    aria-label={pathSentence(p)}
                  >
                    <li className="min-w-0">{renderNode(p.nodeIds[0])}</li>
                    {p.steps.map((step, sIdx) => (
                      <li key={`${step.fromId}-${step.toId}-${sIdx}`} className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        {renderEdge(step.edge, `e-${sIdx}`)}
                        {renderNode(step.toId)}
                      </li>
                    ))}
                  </ol>
                  <p className="sr-only">{pathSentence(p)}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground font-sans">
        Une confirmation est un témoignage personnel et facultatif ; elle ne prouve ni l'identité, ni la filiation.
      </p>
    </div>
  );
};

export default RelationPathsPanel;
