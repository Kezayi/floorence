import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PendingPaymentBannerProps {
  memorialId: string;
}

const PendingPaymentBanner = ({ memorialId }: PendingPaymentBannerProps) => {
  const { user } = useAuth();
  const [pendingTx, setPendingTx] = useState<{ id: string; ebilling_reference: string | null; amount: number; created_at: string } | null>(null);
  const [retrying, setRetrying] = useState(false);

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
        setPendingTx(null);
      } else {
        // If checkout URL available, redirect
        const checkoutUrl = data?.ebilling_response?.ppiUrlCheckout;
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else {
          toast.info(
            data?.payment_status === "NOT_INITIATED"
              ? "Le paiement n'a pas encore été initié. Validez sur votre téléphone."
              : "Le paiement n'est pas encore confirmé. Réessayez dans quelques instants.",
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
    <div className="flex items-center gap-3 px-4 py-3 rounded-sm border border-[hsl(var(--candle-glow)/0.4)] bg-[hsl(var(--candle-glow)/0.08)] mb-6 animate-fade-in">
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
        Réessayer le paiement
      </Button>
    </div>
  );
};

export default PendingPaymentBanner;
