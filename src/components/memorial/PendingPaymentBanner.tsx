import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, RefreshCw, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface PendingPaymentBannerProps {
  memorialId: string;
  /** Called when payment is confirmed so parent can refresh posts */
  onPaymentConfirmed?: () => void;
}

const PendingPaymentBanner = ({ memorialId, onPaymentConfirmed }: PendingPaymentBannerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingTx, setPendingTx] = useState<{ id: string; ebilling_reference: string | null; amount: number; created_at: string } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [statusHint, setStatusHint] = useState<string | null>(null);

  // Fetch pending transaction
  useEffect(() => {
    if (!user || !memorialId) return;

    const fetchPending = async () => {
      const { data } = await supabase
        .from("payment_transactions")
        .select("id, ebilling_reference, amount, created_at")
        .eq("user_id", user.id)
        .eq("memorial_id", memorialId)
        .in("status", ["pending", "timeout"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setPendingTx(data[0]);
      }
    };

    fetchPending();
  }, [user, memorialId]);

  // ── AUTO-CHECK: silent status verification on mount ──
  const resolvePayment = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ["guestbook-posts", memorialId] });
    queryClient.invalidateQueries({ queryKey: ["memorial", memorialId] });
    setPendingTx(null);
    onPaymentConfirmed?.();
  }, [queryClient, memorialId, onPaymentConfirmed]);

  useEffect(() => {
    if (!pendingTx?.ebilling_reference) return;

    const silentCheck = async () => {
      try {
        const { data } = await supabase.functions.invoke("ebilling", {
          body: { action: "check-status", reference: pendingTx.ebilling_reference },
        });

        if (data?.success) {
          toast.success("Paiement confirmé ! Votre hommage est maintenant visible.");
          await resolvePayment();
        } else if (data?.payment_status === "NOT_INITIATED") {
          setStatusHint("not_initiated");
        }
      } catch {
        // Silent — don't disturb user
      }
    };

    silentCheck();
  }, [pendingTx?.ebilling_reference, resolvePayment]);

  if (!pendingTx) return null;

  const handleRetry = async () => {
    if (!pendingTx.ebilling_reference) return;
    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke("ebilling", {
        body: { action: "check-status", reference: pendingTx.ebilling_reference },
      });

      if (error) {
        toast.error("Erreur lors de la vérification");
        return;
      }

      if (data?.success) {
        toast.success("Paiement confirmé ! Votre hommage est maintenant visible.");
        await resolvePayment();
      } else {
        // No checkout URL redirect needed — the USSD flow doesn't use redirects
        // The user should validate on their phone

        if (data?.payment_status === "NOT_INITIATED") {
          setStatusHint("not_initiated");
          toast.info(
            "Paiement en attente. Tapez votre code secret sur votre téléphone. Si vous n'avez rien reçu, cliquez sur Réessayer.",
            { duration: 10000 }
          );
        } else {
          toast.info(
            "Le paiement n'est pas encore confirmé. Réessayez dans quelques instants.",
            { duration: 8000 }
          );
        }
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 px-4 py-3 rounded-sm border border-[hsl(var(--candle-glow)/0.4)] bg-[hsl(var(--candle-glow)/0.08)] mb-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 text-[hsl(var(--candle-glow))]" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-serif text-foreground">
            Votre hommage est en attente de paiement.
          </p>
          <p className="text-xs font-sans text-muted-foreground mt-0.5">
            Montant : {pendingTx.amount.toLocaleString()} XAF
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 text-xs"
          disabled={retrying}
          onClick={handleRetry}
        >
          {retrying ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Réessayer
        </Button>
      </div>

      {statusHint === "not_initiated" && (
        <div className="flex items-start gap-2 pl-8">
          <Phone className="w-3.5 h-3.5 shrink-0 text-muted-foreground mt-0.5" />
          <p className="text-xs font-sans text-muted-foreground">
            Tapez votre code secret sur votre téléphone pour valider. Si vous n'avez rien reçu, cliquez sur <strong>Réessayer</strong>.
          </p>
        </div>
      )}
    </div>
  );
};

export default PendingPaymentBanner;
