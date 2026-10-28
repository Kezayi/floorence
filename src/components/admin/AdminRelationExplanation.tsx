import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type AdminMemorialContext, extractCitedMemorialIds, citedPairs, MAX_CITED_FOR_PATHS } from "@/lib/adminRelationContext";
import RelationPathsPanel from "@/components/memorial/RelationPathsPanel";

interface Props {
  candidates: AdminMemorialContext[];
  /** Raw answer text; only exact [[mem:UUID]] citations present in `candidates` are used. */
  answer?: string;
  /** Extra secondary tools placed inside the "Outils complémentaires" section. */
  extraTools?: ReactNode;
}

export function AdminRelationExplanation({ candidates, answer = "", extraTools }: Props) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const ids = candidates.map((m) => m.id).sort();
  const visibleQ = useQuery({
    queryKey: ["admin-relation-context-visible", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      // Normal session client + explicit public gate: no service-role lookup.
      const { data, error } = await supabase.from("memorials")
        .select("id, first_name, last_name")
        .in("id", ids).eq("is_active", true).eq("is_published", true).is("deleted_at", null);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const visible = visibleQ.isError ? [] : visibleQ.data ?? [];
  const allowedIds = visible.map((m) => m.id);
  const byId = new Map(visible.map((m) => [m.id.toLowerCase(), m]));
  const source = visible.find((m) => m.id === fromId);
  const target = visible.find((m) => m.id === toId && m.id !== fromId);

  const cited = extractCitedMemorialIds(answer, ids);
  const citedVisible = cited.filter((id) => byId.has(id));
  const hidden = cited.length - citedVisible.length;
  const pairs = citedPairs(citedVisible);
  const nameOf = (id: string) => { const m = byId.get(id)!; return `${m.first_name} ${m.last_name}`; };

  const status = (text: string) => <p role="status" className="text-sm text-muted-foreground">{text}</p>;

  let automatic: ReactNode;
  if (cited.length === 0) automatic = status("La réponse ne cite aucun mémorial par identifiant canonique : aucun chemin étayé.");
  else if (visibleQ.isLoading) automatic = status("Vérification des sources accessibles…");
  else if (visibleQ.isError) automatic = <p role="alert" className="text-sm text-destructive">Sources indisponibles. Aucun parcours n'est proposé.</p>;
  else if (citedVisible.length < 2) automatic = status(
    citedVisible.length === 1
      ? `Un seul mémorial cité et accessible (${nameOf(citedVisible[0])}) : aucun chemin étayé entre mémoriaux.`
      : "Aucun mémorial cité n'est accessible : aucun chemin étayé.");
  else automatic = (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Chemins reconstitués à partir des seuls liens acceptés entre les mémoriaux cités par la réponse. Ils ne prouvent pas les affirmations de l'IA.
      </p>
      {citedVisible.length > MAX_CITED_FOR_PATHS && status(`Seuls les ${MAX_CITED_FOR_PATHS} premiers mémoriaux cités sont comparés.`)}
      {pairs.map(([a, b]) => (
        <div key={`${a}:${b}`} className="space-y-1">
          <p className="text-xs font-medium text-foreground">{nameOf(a)} → {nameOf(b)}</p>
          <RelationPathsPanel memorialId={byId.get(a)!.id} deceasedName={nameOf(a)}
            targetMemorialId={byId.get(b)!.id} allowedMemorialIds={allowedIds} />
        </div>
      ))}
    </div>
  );

  return (
    <section aria-label="Sources et chemins relationnels" className="mt-5 border-t border-border pt-4 space-y-3">
      <h3 className="font-serif text-lg text-foreground">Chemins relationnels de cette réponse</h3>
      {automatic}
      {hidden > 0 && status(`${hidden} mémorial(aux) cité(s) non accessible(s), exclu(s) des parcours.`)}

      <details className="border-t border-border pt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground">Outils complémentaires</summary>
        <div className="mt-3 space-y-3">
          {ids.length === 0 ? status("Source canonique non disponible pour cette réponse.")
            : visibleQ.isLoading ? status("Vérification des sources accessibles…")
            : visibleQ.isError ? <p role="alert" className="text-sm text-destructive">Sources indisponibles.</p>
            : visible.length < 2 ? status("Sources insuffisantes pour une comparaison manuelle.")
            : (
              <>
                <p className="text-xs text-muted-foreground">Comparaison manuelle entre deux mémoriaux du contexte ; ce ne sont pas des citations de la réponse.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs text-foreground space-y-1">
                    <span className="block">Depuis le mémorial</span>
                    <select aria-label="Depuis le mémorial" value={source ? fromId : ""}
                      onChange={(e) => { setFromId(e.target.value); setToId(""); }}
                      className="w-full min-w-0 border border-border rounded-md bg-background p-2 text-sm">
                      <option value="">Choisir une source</option>
                      {visible.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name} · {m.id.slice(-6)}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-foreground space-y-1">
                    <span className="block">Vers le mémorial</span>
                    <select aria-label="Vers le mémorial" value={target ? toId : ""} disabled={!source}
                      onChange={(e) => setToId(e.target.value)}
                      className="w-full min-w-0 border border-border rounded-md bg-background p-2 text-sm disabled:opacity-60">
                      <option value="">Choisir une destination</option>
                      {visible.filter((m) => m.id !== fromId).map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name} · {m.id.slice(-6)}</option>)}
                    </select>
                  </label>
                </div>
                {source && target && (
                  <RelationPathsPanel key={`${source.id}:${target.id}`} memorialId={source.id}
                    deceasedName={`${source.first_name} ${source.last_name}`} targetMemorialId={target.id}
                    allowedMemorialIds={allowedIds} />
                )}
              </>
            )}
          {extraTools}
        </div>
      </details>
    </section>
  );
}
