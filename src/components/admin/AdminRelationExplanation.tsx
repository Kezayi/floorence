import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type AdminMemorialContext } from "@/lib/adminRelationContext";
import RelationPathsPanel from "@/components/memorial/RelationPathsPanel";

/** Context candidates are explicitly chosen, never joined to an AI answer by name. */
export function AdminRelationExplanation({ candidates }: { candidates: AdminMemorialContext[] }) {
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
  const source = visible.find((m) => m.id === fromId);
  const target = visible.find((m) => m.id === toId && m.id !== fromId);

  return (
    <section aria-label="Sources et chemins relationnels" className="mt-5 border-t border-border pt-4 space-y-3">
      <h3 className="font-serif text-lg text-foreground">Sources et chemins relationnels</h3>
      <p className="text-xs text-muted-foreground">
        La réponse ne cite pas d'identifiants de liens vérifiables. Son chemin est non étayé.
      </p>
      {ids.length === 0 ? (
        <p role="status" className="text-sm text-muted-foreground">Source canonique non disponible pour cette réponse.</p>
      ) : visibleQ.isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">Vérification des sources accessibles…</p>
      ) : visibleQ.isError ? (
        <p role="alert" className="text-sm text-destructive">Sources indisponibles. Aucun parcours n'est proposé.</p>
      ) : visible.length < 2 ? (
        <p role="status" className="text-sm text-muted-foreground">Sources insuffisantes pour étayer un parcours entre mémoriaux.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Vérification indépendante entre deux mémoriaux du contexte Floorence ; ces sources ne sont pas des citations de la réponse.
          </p>
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
    </section>
  );
}