import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchFamilyRelationGraph, fetchResolvedGraph } from "@/lib/resolvedGraphs";
import { buildVerifiedEdges, findRelationPaths } from "@/lib/relationPaths";
import { buildRelationalScope, KIND_LABELS, type ScopeStatementKind, type MemorialLands } from "@/lib/relationScope";
import { countryName } from "@/lib/geoLands";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * RIBENGA-08 — « Portée relationnelle » : lecture argumentée croisant
 * Lignage, Maillage et Terres, UNIQUEMENT à partir de sources admissibles
 * (liens acceptés, confirmations comptées, terres déclarées, chemins avérés).
 * Aucune IA, aucun scoring, aucune filiation affirmée sans preuve.
 * Toute donnée absente ou indisponible est dite « non étayée ».
 */

interface RelationalScopePanelProps {
  memorialId: string;
  deceasedName: string;
}

const KIND_STYLES: Record<ScopeStatementKind, string> = {
  fact: "border-border text-foreground",
  declaration: "border-border text-muted-foreground",
  confirmation: "border-ai-gold/30 bg-ai-gold/10 text-ai-gold-foreground",
  hypothesis: "border-dashed border-ai-gold/30 text-muted-foreground",
  unsubstantiated: "border-dashed border-border text-muted-foreground/70",
};

const RelationalScopePanel = ({ memorialId, deceasedName }: RelationalScopePanelProps) => {
  const graphQ = useQuery({
    queryKey: ["family-relation-graph", memorialId],
    queryFn: () => fetchFamilyRelationGraph(memorialId),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const lineageQ = useQuery({
    queryKey: ["memorial-lineage-accepted", memorialId],
    queryFn: () => fetchResolvedGraph(memorialId, "lineage", ["accepted"]),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const landsQ = useQuery({
    queryKey: ["memorial-lands", memorialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memorials")
        .select("origin_country, origin_locality, residence_country, residence_locality, burial_country, burial_locality")
        .eq("id", memorialId)
        .maybeSingle();
      if (error) throw error;
      return data as MemorialLands | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const edges = useMemo(
    () => buildVerifiedEdges(graphQ.data?.edges ?? []),
    [graphQ.data],
  );

  const directEdges = useMemo(
    () => edges.filter((e) => e.aId === memorialId || e.bId === memorialId),
    [edges, memorialId],
  );
  const directRelationIds = useMemo(() => directEdges.map((e) => e.relationId), [directEdges]);

  const countsQ = useQuery({
    queryKey: ["relation-confirmation-counts", directRelationIds],
    enabled: directRelationIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_relation_confirmation_counts", {
        p_relation_ids: directRelationIds,
      });
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of data || []) map.set(row.relation_id, Number(row.confirmations));
      return map;
    },
    staleTime: 60_000,
  });

  // Mémoriaux atteignables par chemins avérés (identifiants canoniques uniquement)
  const reachable = useMemo(() => {
    if (!graphQ.data) return { count: 0, landNames: [] as string[] };
    let count = 0;
    const landSet = new Set<string>();
    for (const m of graphQ.data.memorials) {
      if (m.id === memorialId) continue;
      const paths = findRelationPaths(edges, memorialId, m.id, { maxDepth: 4, maxPaths: 1 });
      if (paths.length === 0) continue;
      count += 1;
      for (const c of [m.origin_country, m.residence_country, m.burial_country]) {
        if (c) landSet.add(countryName(c));
      }
    }
    return { count, landNames: Array.from(landSet).sort() };
  }, [graphQ.data, edges, memorialId]);

  const statements = useMemo(() => {
    const directLinkedCount = new Set(
      directEdges.map((e) => (e.aId === memorialId ? e.bId : e.aId)),
    ).size;
    const confirmationsTotal =
      directRelationIds.length === 0
        ? 0
        : countsQ.data
          ? directRelationIds.reduce((sum, id) => sum + (countsQ.data.get(id) ?? 0), 0)
          : null; // RPC indisponible ou en chargement : jamais de faux 0
    return buildRelationalScope({
      masterName: deceasedName,
      masterLands: landsQ.isError ? null : (landsQ.data ?? null),
      directRelationIds: graphQ.isError ? [] : directRelationIds,
      directLinkedCount,
      lineageCount: lineageQ.isError ? null : lineageQ.data ? lineageQ.data.edges.length : null,
      confirmationsTotal: countsQ.isError ? null : confirmationsTotal,
      reachableCount: reachable.count,
      reachableLandNames: reachable.landNames,
    });
  }, [directEdges, directRelationIds, countsQ, graphQ.isError, lineageQ, landsQ, reachable, memorialId, deceasedName]);

  if (graphQ.isLoading || landsQ.isLoading) {
    return <Skeleton className="h-24 w-full rounded-sm" />;
  }

  return (
    <div className="bg-muted/30 border border-border/60 p-5 rounded-sm">
      <div className="flex items-center gap-2 mb-1">
        <Compass className="w-4 h-4 text-foreground/60" />
        <h4 className="font-serif text-lg">Portée relationnelle</h4>
      </div>
      <p className="text-xs text-muted-foreground font-sans mb-4">
        Synthèse croisée du lignage, du maillage et des terres déclarées — chaque
        affirmation indique sa nature et sa source.
      </p>

      <ul className="space-y-3">
        {statements.map((s, idx) => (
          <li key={idx} className="space-y-1">
            <span
              className={`inline-block text-[10px] font-sans px-1.5 py-0.5 rounded-sm border ${KIND_STYLES[s.kind]}`}
            >
              {KIND_LABELS[s.kind]}
            </span>
            <p className="text-sm font-serif text-foreground">{s.text}</p>
            <p className="text-[11px] font-sans text-muted-foreground/70">
              Source : {s.source}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RelationalScopePanel;
