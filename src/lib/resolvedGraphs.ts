import { supabase } from "@/integrations/supabase/client";

/**
 * M2.3G — Minimal adapters over the consolidated graph RPCs.
 * Endpoints are already resolved to the Master identity server-side (RLS of the caller applies).
 * Original declarations (labels + orientation) are recovered from memorial_relations by id
 * so existing label logic is preserved. No inference, no arbitration of conflicts.
 */
export interface ResolvedEdgeRaw {
  linkedId: string;
  /** Original declaration, re-oriented on resolved endpoints */
  relationType: string;
  /** true if the Master (resolved) is memorial_id_1 of the original declaration */
  masterIsSource: boolean;
  status: string;
  isConflict: boolean;
  relationId: string;
}

export interface ResolvedGraphRaw {
  edges: ResolvedEdgeRaw[];
  memorials: Array<{
    id: string; first_name: string; last_name: string; photo_url: string | null;
    photos: string[] | null; default_photo_index: number | null;
    share_token: string | null; created_by: string;
  }>;
}

export async function fetchResolvedGraph(
  masterId: string,
  kind: "lineage" | "relations",
  statuses: string[],
): Promise<ResolvedGraphRaw> {
  const rpc = kind === "lineage" ? "get_resolved_memorial_lineage" : "get_resolved_memorial_relations";
  const { data: rows, error } = await supabase.rpc(rpc, { p_master_id: masterId });
  if (error) throw error;
  const kept = (rows || []).filter((r) =>
    statuses.includes(r.status ?? "") && (r.endpoint_a === masterId || r.endpoint_b === masterId),
  );
  if (kept.length === 0) return { edges: [], memorials: [] };

  const relIds = Array.from(new Set(kept.flatMap((r) => r.relation_ids || [])));
  const { data: originals } = await supabase
    .from("memorial_relations")
    .select("id, relation_type, memorial_id_1, memorial_id_2")
    .in("id", relIds);
  const origMap = new Map((originals || []).map((o) => [o.id, o]));
  const { data: fam } = await supabase.rpc("get_memorial_family_ids", { p_master_id: masterId });
  const family = new Set<string>([masterId, ...((fam as string[] | null) || [])]);

  const edges: ResolvedEdgeRaw[] = [];
  const seen = new Set<string>();
  for (const r of kept) {
    const linkedId = r.endpoint_a === masterId ? r.endpoint_b : r.endpoint_a;
    if (!linkedId || linkedId === masterId) continue;
    for (const rid of r.relation_ids || []) {
      const o = origMap.get(rid);
      if (!o) continue;
      // Orientation: Master family (Master + direct sources) on memorial_id_1 => Master is source.
      const masterIsSource = !!o.memorial_id_1 && family.has(o.memorial_id_1);
      const key = `${linkedId}|${o.relation_type}|${masterIsSource}|${r.status}`;
      if (seen.has(key)) continue; // dedup identical declarations (no doubled edge)
      seen.add(key);
      edges.push({
        linkedId, relationType: o.relation_type, masterIsSource,
        status: r.status ?? "", isConflict: !!r.is_conflict, relationId: rid,
      });
    }
  }

  const linkedIds = Array.from(new Set(edges.map((e) => e.linkedId)));
  const { data: mems } = linkedIds.length
    ? await supabase
        .from("memorials")
        .select("id, first_name, last_name, photo_url, photos, default_photo_index, share_token, created_by")
        .in("id", linkedIds)
    : { data: [] };
  return { edges, memorials: (mems || []) as ResolvedGraphRaw["memorials"] };
}

/**
 * RIBENGA-06 — Graphe famille COMPLET (toutes les arêtes résolues, pas seulement
 * celles qui touchent le Master), pour les chemins relationnels multi-sauts.
 * Même RPC serveur que fetchResolvedGraph : la visibilité (RLS) reste l'autorité.
 * Une arête dont une extrémité n'est pas lisible par l'appelant est écartée :
 * on ne traverse jamais un mémorial non accessible.
 */
export interface FamilyGraphEdgeRaw {
  aId: string;
  bId: string;
  relationIds: string[];
  label: string;
}

export interface FamilyGraphMemorial {
  id: string;
  first_name: string;
  last_name: string;
  slug: string;
  share_token: string | null;
  photo_url: string | null;
  photos: string[] | null;
  default_photo_index: number | null;
}

export interface FamilyGraphRaw {
  edges: FamilyGraphEdgeRaw[];
  memorials: FamilyGraphMemorial[];
}

export async function fetchFamilyRelationGraph(masterId: string): Promise<FamilyGraphRaw> {
  const { data: rows, error } = await supabase.rpc("get_resolved_memorial_relations", {
    p_master_id: masterId,
  });
  if (error) throw error;

  const kept = (rows || []).filter(
    (r) => r.status === "accepted" && !r.is_conflict && r.endpoint_a && r.endpoint_b && r.endpoint_a !== r.endpoint_b,
  );
  if (kept.length === 0) return { edges: [], memorials: [] };

  const endpointIds = new Set<string>();
  for (const r of kept) {
    endpointIds.add(r.endpoint_a);
    endpointIds.add(r.endpoint_b);
  }

  const { data: mems } = await supabase
    .from("memorials")
    .select("id, first_name, last_name, slug, share_token, photo_url, photos, default_photo_index")
    .in("id", Array.from(endpointIds));
  const memorials = (mems || []) as FamilyGraphMemorial[];
  const visibleIds = new Set(memorials.map((m) => m.id));

  const edges: FamilyGraphEdgeRaw[] = kept
    .filter((r) => visibleIds.has(r.endpoint_a) && visibleIds.has(r.endpoint_b))
    .map((r) => ({
      aId: r.endpoint_a,
      bId: r.endpoint_b,
      relationIds: r.relation_ids || [],
      label: r.relation_labels?.[0] || r.normalized_type || "Lien déclaré",
    }));

  return { edges, memorials };
}
