import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type AdminMemorialContext, readRelationSourceIds, citedPairs, MAX_CITED_FOR_PATHS } from "@/lib/adminRelationContext";
import RelationPathsPanel from "@/components/memorial/RelationPathsPanel";
import { readTributeLinks, resolvePersonDeceasedPair, contributorRole, reverseTributeRole } from "@/lib/tributeRelation";
import { describeDeclared, declaredParticiple, resolveQuestionPair, withArticle, isPairQuestion } from "@/lib/relationDirection";

/** Direct accepted declarations between A and B, worded in both directions from stored orientation. */
function DeclaredBetween({ a, b, nameA, nameB, oriented = false }: { a: string; b: string; nameA: string; nameB: string; oriented?: boolean }) {
  const q = useQuery({
    queryKey: ["ribenga-declared-between", a, b],
    queryFn: async () => {
      const { data, error } = await supabase.from("memorial_relations")
        .select("id, relation_type, memorial_id_1, memorial_id_2, status").eq("status", "accepted")
        .or(`and(memorial_id_1.eq.${a},memorial_id_2.eq.${b}),and(memorial_id_1.eq.${b},memorial_id_2.eq.${a})`);
      if (error) throw error;
      const rows = data ?? [];
      const statements = describeDeclared(rows, a, b).map((s) => ({ ...s, part: declaredParticiple(rows.find((r) => r.id === s.relationId)!, a) }));
      if (!statements.length) return { statements, counts: new Map<string, number>() };
      const { data: c, error: ce } = await supabase.rpc("get_relation_confirmation_counts", { p_relation_ids: statements.map((s) => s.relationId) });
      return { statements, counts: ce ? null : new Map((c ?? []).map((r) => [r.relation_id, Number(r.confirmations)])) };
    },
    staleTime: 60_000,
  });
  if (q.isLoading) return <p role="status" className="text-xs text-muted-foreground">Lecture des liens déclarés…</p>;
  if (q.isError) return <p role="alert" className="text-xs text-destructive">Liens déclarés indisponibles.</p>;
  const { statements, counts } = q.data!;
  if (!statements.length) return <p className="text-xs text-muted-foreground">Aucun lien direct déclaré entre {nameA} et {nameB}.</p>;
  return (
    <>
    {oriented && statements.length > 1 && <p role="status" className="text-xs text-muted-foreground">Plusieurs liens déclarés coexistent ; aucun n'est retenu à la place des autres.</p>}
    <ul className="text-sm text-foreground space-y-1" aria-label="Liens directs déclarés">
      {statements.map((s) => {
        const n = counts?.get(s.relationId);
        return (
          <li key={s.relationId}>
            {oriented ? <>Selon le lien déclaré, {nameA} est {withArticle(s.aToB)} de {nameB}.</>
              : <>Selon le lien déclaré : {nameA} est {s.aToB} de {nameB} · {nameB} est {s.bToA} de {nameA}.</>}{" "}
            <span className="text-xs text-muted-foreground">Statut : déclaré · {counts === null ? "confirmations indisponibles" : n ? `confirmé par ${n} membre${n > 1 ? "s" : ""} (sans certification)` : "non confirmé"}</span>
          </li>
        );
      })}
    </ul>
    </>
  );
}

interface Props {
  candidates: AdminMemorialContext[];
  /** Separate server-validated source metadata, never answer text. */
  sourceIds?: string[];
  /** Extra secondary tools placed inside the "Explorer une relation précise" section. */
  extraTools?: ReactNode;
  /** Free question as asked; only used to orient a pair of already-cited canonical memorials. */
  question?: string;
  /** Server-validated contributor declarations on the cited memorials (tribute relation_link). */
  tributeLinks?: unknown;
}

/** Person ↔ deceased declaration from the memorial itself, oriented as asked. Never a proof. */
function TributeDeclared({ pair, nameOf }: { pair: Extract<ReturnType<typeof resolvePersonDeceasedPair>, { kind: "ok" }>; nameOf: (id: string) => string }) {
  const { tribute, memorialId, order } = pair;
  const deceased = nameOf(memorialId);
  return (
    <div aria-label="Relation déclarée dans le mémorial" className="space-y-1 border-l-2 border-border pl-3">
      <p className="text-xs font-medium text-foreground">Relation déclarée au sein du mémorial de {deceased}</p>
      {tribute.links.length > 1 && <p role="status" className="text-xs text-muted-foreground">Libellés différents déclarés par ce contributeur ; aucun n'est retenu à la place des autres.</p>}
      <ul className="text-sm text-foreground space-y-1">
        {tribute.links.map((label) => {
          const rev = reverseTributeRole(label);
          return (
            <li key={label}>
              {order === "person-first" || !rev
                ? <>Selon sa déclaration, {tribute.author} est {contributorRole(label)} de {deceased} (« {label} »).</>
                : <>Selon la déclaration de {tribute.author}, {deceased} est {rev} de {tribute.author} (« {label} »).</>}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">Statut : déclaré, non certifié · Source : hommage de {tribute.author}. Le libellé du Lignage issu de cet hommage est la même source, pas un témoignage indépendant.</p>
    </div>
  );
}

export function AdminRelationExplanation({ candidates, sourceIds = [], extraTools, question = "", tributeLinks }: Props) {
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

  const cited = readRelationSourceIds(sourceIds, candidates);
  const citedVisible = cited.filter((id) => byId.has(id));
  const hidden = cited.length - citedVisible.length;
  const pairs = citedPairs(citedVisible);
  const tributes = readTributeLinks(tributeLinks, citedVisible);
  const personPair = resolvePersonDeceasedPair(question, citedVisible.map((id) => byId.get(id)!), tributes);
  const asked = resolveQuestionPair(question, citedVisible.map((id) => byId.get(id)!));
  const nameOf = (id: string) => { const m = byId.get(id); return m ? `${m.first_name} ${m.last_name}` : "Source non disponible"; };

  const status = (text: string) => <p role="status" className="text-sm text-muted-foreground">{text}</p>;

  let automatic: ReactNode;
  if (cited.length === 0) automatic = status("Aucune source pertinente avec identifiant canonique n’a été retournée : aucun chemin étayé.");
  else if (visibleQ.isLoading) automatic = status("Vérification des sources accessibles…");
  else if (visibleQ.isError) automatic = <p role="alert" className="text-sm text-destructive">Sources indisponibles. Aucun parcours n'est proposé.</p>;
  else if (citedVisible.length < 2) automatic = status(
    citedVisible.length === 1
      ? `Un seul mémorial identifié et accessible (${nameOf(citedVisible[0])}) : aucun chemin étayé entre mémoriaux.`
      : "Aucun mémorial identifié n'est accessible : aucun chemin étayé.");
  else automatic = (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Chemins reconstitués à partir des seuls liens acceptés entre les sources identifiées par le moteur. Ils ne prouvent pas les affirmations de l'IA.
      </p>
      {asked && (
        <div aria-label="Réponse orientée selon la question" className="space-y-1 border-l-2 border-border pl-3">
          <p className="text-xs font-medium text-foreground">Lien direct stocké, dans le sens de la question</p>
          <DeclaredBetween a={asked[0]} b={asked[1]} nameA={nameOf(asked[0])} nameB={nameOf(asked[1])} oriented />
          <p className="text-xs text-muted-foreground">Seule cette ligne provient des liens acceptés stockés ; le texte de l'IA ci-dessus n'est pas vérifié.</p>
        </div>
      )}
      {!asked && isPairQuestion(question) && status("Impossible d'établir le sens du lien : les deux personnes de la question ne correspondent pas chacune à un seul mémorial source identifié.")}
      {citedVisible.length > MAX_CITED_FOR_PATHS && status(`Seuls les ${MAX_CITED_FOR_PATHS} premiers mémoriaux identifiés sont comparés.`)}
      {pairs.map(([a, b]) => (
        <div key={`${a}:${b}`} className="space-y-1">
          <p className="text-xs font-medium text-foreground">{nameOf(a)} → {nameOf(b)}</p>
          {!(asked && new Set([a, b, ...asked]).size === 2) && <DeclaredBetween a={a} b={b} nameA={nameOf(a)} nameB={nameOf(b)} />}
          <RelationPathsPanel memorialId={a} deceasedName={nameOf(a)}
            targetMemorialId={b} allowedMemorialIds={allowedIds} />
        </div>
      ))}
    </div>
  );

  return (
    <section aria-label="Sources et chemins relationnels" className="mt-5 border-t border-border pt-4 space-y-3">
      <h3 className="font-serif text-lg text-foreground">Chemins relationnels de cette réponse</h3>
      {!visibleQ.isLoading && personPair?.kind === "ok" && <TributeDeclared pair={personPair} nameOf={nameOf} />}
      {!visibleQ.isLoading && personPair?.kind === "ambiguous" && status("Plusieurs contributeurs ou comptes portent ce nom sur ce mémorial : relation déclarée non attribuée.")}
      {!visibleQ.isLoading && personPair?.kind === "none" && status("Aucune relation déclarée par cette personne n'a été trouvée dans les hommages de ce mémorial.")}
      {personPair?.kind !== "ok" && automatic}
      {hidden > 0 && status(`${hidden} mémorial(aux) identifié(s) non accessible(s), exclu(s) des parcours.`)}

      <details className="border-t border-border pt-3">
        <summary className="cursor-pointer text-xs text-muted-foreground">Explorer une relation précise</summary>
        <div className="mt-3 space-y-3">
          {ids.length === 0 ? status("Source canonique non disponible pour cette réponse.")
            : visibleQ.isLoading ? status("Vérification des sources accessibles…")
            : visibleQ.isError ? <p role="alert" className="text-sm text-destructive">Sources indisponibles.</p>
            : visible.length < 2 ? status("Sources insuffisantes pour une comparaison manuelle.")
            : (
              <>
                <p className="text-xs text-muted-foreground">Comparaison manuelle entre deux mémoriaux du contexte.</p>
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
