import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Confirmation communautaire volontaire d'un lien ACCEPTÉ entre mémoriaux (memorial_relations.id).
 * Témoignage personnel : ne prouve ni identité, ni filiation. Le serveur (RLS + trigger) reste l'autorité.
 * Jamais de DELETE : le retrait renseigne revoked_at.
 */
export default function RelationConfirmation({ relationId }: { relationId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const countQ = useQuery({
    queryKey: ["relation-confirmation-count", relationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_relation_confirmation_counts", { p_relation_ids: [relationId] });
      if (error) throw error;
      const row = data?.find((r) => r.relation_id === relationId);
      return row ? Number(row.confirmations) : null;
    },
    staleTime: 60_000,
  });

  const mineQ = useQuery({
    queryKey: ["relation-confirmation-mine", relationId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relation_confirmations")
        .select("id")
        .eq("relation_id", relationId)
        .eq("confirmer_id", user!.id)
        .is("revoked_at", null)
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["relation-confirmation-count", relationId] });
    qc.invalidateQueries({ queryKey: ["relation-confirmation-mine", relationId] });
  };

  const explain = (msg?: string) => {
    if (!msg) return "Action impossible pour le moment.";
    if (msg.includes("auteurs et gestionnaires")) return "Vous avez déclaré ou gérez ce lien : votre confirmation ne serait pas indépendante.";
    if (msg.includes("non admissible")) return "Ce lien ne peut pas être confirmé.";
    if (msg.includes("duplicate") || msg.includes("unique")) return "Vous avez déjà confirmé ce lien.";
    if (msg.includes("permission") || msg.includes("row-level")) return "Vous n'êtes pas autorisé à effectuer cette action.";
    return "Action impossible pour le moment.";
  };

  const confirm = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("relation_confirmations")
        .insert({ relation_id: relationId, confirmer_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Votre témoignage est enregistré."); refresh(); },
    onError: (e: Error) => { toast.error(explain(e.message)); refresh(); },
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("relation_confirmations")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Votre confirmation est retirée."); refresh(); },
    onError: (e: Error) => { toast.error(explain(e.message)); refresh(); },
  });

  const count = countQ.data;
  const busy = confirm.isPending || revoke.isPending;
  const eligible = countQ.isSuccess && count !== null && count !== undefined;
  const label = countQ.isError || (countQ.isSuccess && count === null)
    ? "Lien déclaré · statut indisponible"
    : !eligible
      ? "Lien déclaré"
      : count > 0
        ? `Confirmé par ${count} membre${count > 1 ? "s" : ""}`
        : "Lien déclaré · Non confirmé";

  return (
    <div className="ml-5 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-sans text-muted-foreground">
      <span aria-live="polite">{label}</span>
      {user && eligible && mineQ.isSuccess && (
        mineQ.data ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => { if (!busy) revoke.mutate(mineQ.data as string); }}
            className={`underline underline-offset-2 hover:text-foreground disabled:opacity-60 disabled:cursor-wait`}
          >
            Retirer ma confirmation
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => { if (!busy) confirm.mutate(); }}
            title="Témoignage personnel : ne prouve ni l'identité, ni la filiation."
            className={`underline underline-offset-2 hover:text-foreground disabled:opacity-60 disabled:cursor-wait`}
          >
            Je confirme ce lien
          </button>
        )
      )}
    </div>
  );
}
