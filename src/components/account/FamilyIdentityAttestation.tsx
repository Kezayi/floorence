import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * Attestation d'identité familiale (M2.5E).
 * Enregistre UNIQUEMENT une confirmation `confirmed` dans memorial_merge_confirmations.
 * N'exécute jamais de fusion (réservée au back-office via admin_merge_memorial).
 * La sécurité est garantie côté serveur : RLS is_master_representative, trigger mmc_guard
 * (recalcule confirmer_capacity), index unique uq_mmc_active_source, chk_mmc_not_self.
 */

interface MemorialLite {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  death_date: string | null;
}

interface Confirmation {
  id: string;
  source_memorial_id: string;
  master_memorial_id: string;
  status: string;
  confirmed_at: string;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
const fullName = (m?: MemorialLite) => (m ? `${m.first_name} ${m.last_name}` : "Avis indisponible");

export const FamilyIdentityAttestation = ({ userId }: { userId: string }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [masters, setMasters] = useState<MemorialLite[]>([]);
  const [sources, setSources] = useState<MemorialLite[]>([]);
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [masterId, setMasterId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [attested, setAttested] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const cols = "id, first_name, last_name, birth_date, death_date";
      const [own, pub, conf] = await Promise.all([
        supabase
          .from("memorials")
          .select(`${cols}, created_by, heir_user_id, merged_into, deleted_at`)
          .or(`created_by.eq.${userId},heir_user_id.eq.${userId}`)
          .is("deleted_at", null)
          .is("merged_into", null),
        supabase
          .from("v_public_memorials")
          .select(cols)
          .eq("is_published", true)
          .eq("is_active", true)
          .is("merged_into", null)
          .order("last_name"),
        supabase
          .from("memorial_merge_confirmations")
          .select("id, source_memorial_id, master_memorial_id, status, confirmed_at")
          .eq("confirmed_by", userId)
          .order("confirmed_at", { ascending: false }),
      ]);
      if (own.error || pub.error || conf.error) throw own.error || pub.error || conf.error;
      // Représentant habilité = Gardien désigné, sinon créateur (miroir de is_master_representative)
      setMasters(
        (own.data || []).filter((m: any) => (m.heir_user_id ?? m.created_by) === userId) as MemorialLite[]
      );
      setSources((pub.data || []) as MemorialLite[]);
      setConfirmations((conf.data || []) as Confirmation[]);
    } catch {
      toast.error("Impossible de charger les attestations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const byId = useMemo(() => {
    const map = new Map<string, MemorialLite>();
    [...sources, ...masters].forEach((m) => map.set(m.id, m));
    return map;
  }, [sources, masters]);

  const activeSourceIds = new Set(
    confirmations.filter((c) => c.status === "confirmed").map((c) => c.source_memorial_id)
  );
  const sourceOptions = sources.filter((s) => s.id !== masterId && !activeSourceIds.has(s.id));
  const master = byId.get(masterId);
  const source = byId.get(sourceId);
  const canSubmit = !!masterId && !!sourceId && masterId !== sourceId && attested && !saving;

  const reset = () => {
    setMasterId("");
    setSourceId("");
    setAttested(false);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const { error } = await supabase.from("memorial_merge_confirmations").insert({
      source_memorial_id: sourceId,
      master_memorial_id: masterId,
      confirmed_by: userId,
      status: "confirmed",
      // Valeur indicative : recalculée par le serveur (trigger mmc_guard)
      confirmer_capacity: "creator",
    });
    setSaving(false);
    if (error) {
      const msg =
        error.code === "23505"
          ? "Une attestation active existe déjà pour cet avis."
          : error.code === "42501"
          ? "Vous n'êtes pas habilité à attester pour cet avis."
          : error.message || "Attestation refusée.";
      toast.error(msg);
      return;
    }
    toast.success("Attestation enregistrée.");
    setOpen(false);
    reset();
    load();
  };

  if (loading || masters.length === 0) return null;

  return (
    <div className="pt-6 mt-6 border-t border-border space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-sans">Attestation d'identité</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-sans text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          Attester un doublon
        </button>
      </div>

      {confirmations.map((c) => (
        <div key={c.id} className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-sm">
          <ShieldCheck className="w-4 h-4 text-foreground/50 shrink-0" />
          <span className="font-sans">
            {fullName(byId.get(c.source_memorial_id))} → {fullName(byId.get(c.master_memorial_id))} ·{" "}
            {c.status === "confirmed" ? "Attestée" : "Révoquée"} le {fmt(c.confirmed_at)}
          </span>
        </div>
      ))}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Attestation d'identité</DialogTitle>
            <DialogDescription>
              Cette attestation ne regroupe aucun avis. Le regroupement reste soumis à l'administration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-sans text-muted-foreground mb-1">Votre avis (référence)</label>
              <select
                value={masterId}
                onChange={(e) => { setMasterId(e.target.value); setSourceId(""); setAttested(false); }}
                className="w-full p-3 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Choisir…</option>
                {masters.map((m) => (
                  <option key={m.id} value={m.id}>{fullName(m)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-sans text-muted-foreground mb-1">Avis en double</label>
              <select
                value={sourceId}
                disabled={!masterId}
                onChange={(e) => { setSourceId(e.target.value); setAttested(false); }}
                className="w-full p-3 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
              >
                <option value="">Choisir…</option>
                {sourceOptions.map((s) => (
                  <option key={s.id} value={s.id}>{fullName(s)} · {fmt(s.death_date)}</option>
                ))}
              </select>
            </div>

            {master && source && (
              <div className="grid grid-cols-2 gap-3">
                {[source, master].map((m, i) => (
                  <div key={m.id} className="border border-border rounded-sm p-3">
                    <p className="text-xs text-muted-foreground font-sans mb-1">{i === 0 ? "Avis en double" : "Avis de référence"}</p>
                    <p className="font-serif text-lg">{fullName(m)}</p>
                    <p className="text-xs text-muted-foreground font-sans">{fmt(m.birth_date)} – {fmt(m.death_date)}</p>
                  </div>
                ))}
              </div>
            )}

            {master && source && (
              <label className="flex items-start gap-3 text-sm font-serif cursor-pointer">
                <input
                  type="checkbox"
                  checked={attested}
                  onChange={(e) => setAttested(e.target.checked)}
                  className="mt-1"
                />
                J'atteste que ces deux avis de décès concernent une seule et même personne.
              </label>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit} className={!canSubmit ? "opacity-60" : ""} disabled={!canSubmit}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer l'attestation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilyIdentityAttestation;
