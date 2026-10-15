// G1-FIX8 — private resume card for a creator's unpublished (paid) memorial.
// Payment goes exclusively through the existing ebilling function; publication only via server fulfillment.
import { useState } from "react";
import { Loader2, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import EditMemorialDialog from "@/components/memorial/EditMemorialDialog";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { classifyMemorialForDisplay } from "@/lib/memorialPricing";
import { formatDateFrench } from "@/lib/dateUtils";
import { toast } from "sonner";

export interface PendingMemorial {
  id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  birth_date: string | null;
  death_date: string | null;
  funeral_date: string | null;
  funeral_location: string | null;
  biography: string | null;
  photos: string[] | null;
  photo_url: string | null;
  default_photo_index: number | null;
}

export interface MemorialTx {
  id: string;
  status: string;
  amount: number;
  ebilling_reference: string | null;
  created_at: string;
  metadata?: { local_closure?: string } | null;
}

interface Props {
  memorial: PendingMemorial;
  lastTx: MemorialTx | null;
  onChanged: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente de paiement",
  failed: "Paiement échoué",
  timeout: "Paiement expiré",
  expired: "Paiement expiré",
};

const PendingMemorialCard = ({ memorial, lastTx, onChanged }: Props) => {
  const { data: settings } = useSystemSettings();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  const status = lastTx?.status ?? null;
  // G1-FIX9: timeout with unknown operator status keeps retry blocked (double-debit protection).
  const isUnknown = status === "timeout" && lastTx?.metadata?.local_closure !== "no_operator_bill";
  const isPending = status === "pending" || isUnknown;
  const label = isUnknown ? "Vérification auprès de l'opérateur" : status ? STATUS_LABEL[status] ?? "Non publié" : "Paiement non initié";

  const category = memorial.death_date
    ? classifyMemorialForDisplay(memorial.death_date, memorial.funeral_date ?? "")
    : null;
  const newPrice = category && settings
    ? (category === "future" ? settings.memorial_price_future.amount : settings.memorial_price_past.amount)
    : null;

  const photos = (memorial.photos?.length ? memorial.photos : memorial.photo_url ? [memorial.photo_url] : []);
  const cover = photos[memorial.default_photo_index ?? 0] ?? photos[0];
  const name = `${memorial.first_name} ${memorial.last_name}`;

  const checkStatus = async () => {
    if (!lastTx?.ebilling_reference) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ebilling", {
        body: { action: "check-status", reference: lastTx.ebilling_reference },
      });
      if (error) toast.error("Vérification impossible pour le moment");
      else if (data?.status === "success") toast.success("Paiement confirmé — espace mémoriel publié");
      else if (data?.status === "failed") toast.error("Le paiement a échoué. Vous pouvez réessayer.");
      else toast.info("Paiement toujours en attente. Validez sur votre téléphone.");
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const resume = async () => {
    const clean = phone.replace(/\s+/g, "");
    if (!/^\+?\d{8,15}$/.test(clean)) {
      toast.error("Numéro Mobile Money requis");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ebilling", {
        body: { memorial_id: memorial.id, item_type: "memorial", quantity: 1, phone: clean },
      });
      if (error || !data?.success) {
        let serverMsg: string | undefined = data?.error;
        try { serverMsg = serverMsg ?? (await (error as { context?: Response })?.context?.json())?.error; } catch { /* ignore */ }
        toast.error(serverMsg || "Le paiement n'a pas pu être initié. Votre espace n'est pas publié.");
      } else {
        toast.success(data?.message || "Paiement initié. Validez sur votre téléphone.");
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-sm p-4" data-testid="pending-memorial">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-serif text-lg">{name}</h4>
          <p className="text-sm text-muted-foreground font-sans">
            Créé le {new Date(memorial.created_at).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <span className="px-2 py-1 text-xs font-sans bg-muted text-muted-foreground shrink-0">
          Non publié · {label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setPreview(true)}>
          <Eye className="w-3.5 h-3.5" /> Aperçu privé
        </Button>
        <EditMemorialDialog
          memorialId={memorial.id}
          initialData={{
            bio: memorial.biography ?? "",
            funeralDate: memorial.funeral_date,
            funeralLocation: memorial.funeral_location,
            photos,
            defaultPhotoIndex: memorial.default_photo_index ?? 0,
            memorialId: memorial.id,
          }}
          onSave={onChanged}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        {isPending ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground flex-1 min-w-[12rem]">
              {isUnknown
                ? `Paiement de ${lastTx!.amount.toLocaleString("fr-FR")} XAF non confirmé par l'opérateur. Nouvelle tentative bloquée pour éviter un double débit.`
                : `Paiement en cours : ${lastTx!.amount.toLocaleString("fr-FR")} XAF. Validez sur votre téléphone, puis vérifiez.`}
            </p>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={busy} onClick={checkStatus}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Vérifier le paiement
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Montant de publication : {newPrice === null ? "…" : `${newPrice.toLocaleString("fr-FR")} XAF`} (vérifié au moment du paiement)
            </p>
            <Label htmlFor={`resume-phone-${memorial.id}`} className="text-xs">Numéro Mobile Money</Label>
            <div className="flex gap-2">
              <Input
                id={`resume-phone-${memorial.id}`}
                inputMode="tel"
                placeholder="24107XXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Button size="sm" disabled={busy || !newPrice} onClick={resume}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Reprendre le paiement"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">{name}</DialogTitle>
            <DialogDescription>Aperçu privé — non visible du public tant que le paiement n'est pas confirmé.</DialogDescription>
          </DialogHeader>
          {cover && (
            <div className="bg-secondary flex justify-center">
              <img src={cover} alt={`Portrait de ${name}`} className="max-h-72 object-contain" />
            </div>
          )}
          <p className="text-sm text-muted-foreground font-sans">
            {formatDateFrench(memorial.birth_date)} — {formatDateFrench(memorial.death_date)}
          </p>
          {memorial.funeral_date && (
            <p className="text-sm font-sans">
              Obsèques : {new Date(memorial.funeral_date).toLocaleString("fr-FR")}
              {memorial.funeral_location ? ` · ${memorial.funeral_location}` : ""}
            </p>
          )}
          {memorial.biography && <p className="font-serif whitespace-pre-line">{memorial.biography}</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingMemorialCard;
