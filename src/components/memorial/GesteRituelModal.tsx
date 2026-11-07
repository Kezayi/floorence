import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flame, Flower2, Loader2, AlertTriangle, Smartphone, HelpCircle } from "lucide-react";
import { useMonetization } from "@/hooks/useMonetization";
import { toast } from "@/hooks/use-toast";
import { checkTributePayment, type PaymentRequest } from "@/lib/tributePayment";

const FALLBACK_PRICE = 500;

interface GesteRituelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: "cierge" | "fleur";
  postId: string;
  onConfirm: (phone?: string) => Promise<PaymentRequest | void>;
  onPaymentConfirmed?: () => void;
  candleCount?: number;
  flowerCount?: number;
  totalAmount?: number;
  priceCierge?: number;
  priceFleur?: number;
}

const GesteRituelModal = ({
  open,
  onOpenChange,
  itemType,
  postId,
  onConfirm,
  onPaymentConfirmed,
  candleCount = 0,
  flowerCount = 0,
  totalAmount: externalTotal,
  priceCierge = FALLBACK_PRICE,
  priceFleur = FALLBACK_PRICE,
}: GesteRituelModalProps) => {
  const { data: monetization, isLoading: isLoadingSettings, refetch } = useMonetization();
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ussdWaiting, setUssdWaiting] = useState(false);
  const [ussdTimeout, setUssdTimeout] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [paymentFailure, setPaymentFailure] = useState<string | null>(null);

  // Fallback: use loaded price or 500 FCFA if still loading
  // PROMO-01-FIX1: gestures are always paid, whatever the global switch.
  const isMonetized = true;
  const price = monetization?.prices?.[itemType] ?? FALLBACK_PRICE;

  // Use external total if provided (basket mode), otherwise single-item price
  const hasBasket = candleCount > 0 || flowerCount > 0;
  const computedTotal = hasBasket
    ? (candleCount * priceCierge) + (flowerCount * priceFleur)
    : price;
  const displayTotal = externalTotal ?? computedTotal;

  const Icon = itemType === "cierge" ? Flame : Flower2;
  const label = itemType === "cierge" ? "Cierge" : "Fleur";
  const colorClass = itemType === "cierge" ? "text-gesture-candle" : "text-gesture-flower";

  // Compute validation reasons
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (isMonetized && !phone.trim()) {
      errors.push("Numéro de téléphone requis");
    }
    if (!postId) {
      errors.push("Aucun hommage sélectionné");
    }
    return errors;
  }, [isMonetized, phone, postId]);

  const isDisabled = submitting || !!paymentReference || validationErrors.length > 0;

  // Log props when modal opens
  useEffect(() => {
    if (open) {
      console.log("[GesteRituelModal] OPENED", { postId, itemType, isMonetized, price, candleCount, flowerCount, displayTotal, hasBasket });
      if (!postId) {
        console.error("[GesteRituelModal] ⚠️ postId is undefined/empty at open — parent not passing ID!");
      }
    }
  }, [open, postId, itemType, isMonetized, price]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setUssdWaiting(false);
      setUssdTimeout(false);
      setElapsedSeconds(0);
    }
  }, [open]);

  // Keep the reference on close: reopening checks the SAME transaction, never repeats the debit.
  useEffect(() => {
    if (open && paymentReference) setUssdWaiting(true);
  }, [open, paymentReference]);

  useEffect(() => {
    if (!open || !paymentReference) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        const status = await checkTributePayment(paymentReference);
        if (cancelled) return;
        if (status === "success") {
          setPaymentReference(null); setUssdWaiting(false); setUssdTimeout(false);
          onOpenChange(false); setPhone(""); onPaymentConfirmed?.();
          return;
        }
        if (status === "failed") {
          setPaymentFailure("Paiement refusé ou annulé. Aucun succès n'a été confirmé.");
          setUssdWaiting(false); setUssdTimeout(true);
          return;
        }
        setPaymentFailure(null);
      } catch (error) {
        if (!cancelled) setPaymentFailure(error instanceof Error ? error.message : "Vérification impossible. Le paiement reste en attente.");
      }
      if (!cancelled) timer = setTimeout(check, 5000);
    };
    void check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, paymentReference, onPaymentConfirmed, onOpenChange]);

  // The countdown is informational, not proof of failure. Status checks continue after it.
  useEffect(() => {
    if (!ussdWaiting) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev >= 44) {
          setUssdTimeout(true);
          setUssdWaiting(false);
          clearInterval(interval);
          return 45;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [ussdWaiting]);

  const handleConfirm = async () => {
    // Debug log: always fires, even if validation would block
    console.log("[GesteRituelModal] handleConfirm called", {
      itemType,
      postId,
      isMonetized,
      price,
      validationErrors,
      submitting,
    });

    if (isDisabled) {
      console.warn("[GesteRituelModal] BLOCKED —", validationErrors.join(", "));
      toast({
        title: "Action impossible",
        description: validationErrors.join(" • ") || "Envoi en cours…",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    setPaymentFailure(null);
    try {
      const { data: fresh } = await refetch();
      const currentlyMonetized = true; void fresh;
      const currentPrice = fresh?.prices?.[itemType] ?? FALLBACK_PRICE;

      console.log("[GesteRituelModal] After refetch", { currentlyMonetized, currentPrice });

      if (currentlyMonetized && !phone.trim()) {
        console.warn("[GesteRituelModal] Phone missing after refetch in paid mode");
        return;
      }

      const payment = await onConfirm(currentlyMonetized ? phone.trim() : undefined);
      if (!payment?.reference) throw new Error("Aucune référence de paiement reçue. La demande n'est pas confirmée.");
      setPaymentReference(payment.reference);
      setUssdWaiting(true); setElapsedSeconds(0); setUssdTimeout(false);

      // In free mode, close immediately. In paid mode, keep modal open for USSD feedback.
      if (!currentlyMonetized) {
        onOpenChange(false);
        setPhone("");
      }
    } catch (err) {
      console.error("[GesteRituelModal] Error during confirm:", err);
      setUssdWaiting(false);
      const message = err instanceof Error ? err.message : "La demande de paiement a échoué. Veuillez réessayer.";
      setPaymentFailure(message);
      toast({ title: "Paiement non confirmé", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Icon className={`w-5 h-5 ${colorClass}`} />
            Offrir un {label.toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            {isLoadingSettings
              ? "Chargement des paramètres..."
              : isMonetized
                ? `Montant total : ${displayTotal} XAF via paiement mobile.`
                : "Ce geste est offert gratuitement."}
          </DialogDescription>
        </DialogHeader>

        {/* Allow interaction even while settings load — use fallback price */}
        <div className="space-y-4">
          {paymentFailure && <p role="alert" className="text-sm text-destructive font-sans">{paymentFailure}</p>}
          {/* Price display — basket detail */}
          <div className="space-y-2">
            {hasBasket ? (
              <>
                {candleCount > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 rounded-md bg-muted/50">
                    <span className="text-sm font-sans flex items-center gap-2">
                      <Flame className="w-4 h-4 text-gesture-candle" />
                      {candleCount} × Cierge
                    </span>
                    <span className="text-sm font-serif font-semibold">
                      {isMonetized ? `${candleCount * priceCierge} XAF` : "Offert"}
                    </span>
                  </div>
                )}
                {flowerCount > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 rounded-md bg-muted/50">
                    <span className="text-sm font-sans flex items-center gap-2">
                      <Flower2 className="w-4 h-4 text-gesture-flower" />
                      {flowerCount} × Fleur
                    </span>
                    <span className="text-sm font-serif font-semibold">
                      {isMonetized ? `${flowerCount * priceFleur} XAF` : "Offert"}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-2 rounded-md bg-primary/5 border border-primary/10">
                  <span className="text-sm font-sans font-medium">Total</span>
                  <span className="text-lg font-serif font-bold">
                    {isMonetized ? `${displayTotal} XAF` : "Offert"}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between px-4 py-3 rounded-md bg-muted/50">
                <span className="text-sm font-sans">1 × {label}</span>
                <span className="text-lg font-serif font-semibold">
                  {isMonetized ? `${price} XAF` : "Offert"}
                </span>
              </div>
            )}
          </div>

          {/* Phone input (paid mode only) */}
          {isMonetized && (
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-sans text-muted-foreground">
                Numéro de téléphone mobile (requis)
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="Ex: 077 12 34 56"
                value={phone}
                disabled={submitting || !!paymentReference}
                onChange={(e) => setPhone(e.target.value)}
                className="font-sans"
              />
            </div>
          )}

          {/* USSD Vigilance Alert (paid mode, before payment) */}
          {isMonetized && !ussdWaiting && !ussdTimeout && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-md border border-[hsl(var(--candle-glow)/0.4)] bg-[hsl(var(--candle-glow)/0.08)]">
              <Smartphone className="w-5 h-5 mt-0.5 shrink-0 text-[hsl(var(--candle-glow))]" />
              <p className="text-xs font-sans text-foreground/80 leading-relaxed">
                <span className="font-semibold">Préparez votre téléphone :</span> Une demande de confirmation apparaîtra sur votre écran dans quelques secondes. Gardez-le <span className="font-semibold">déverrouillé</span>.
              </p>
            </div>
          )}

          {/* USSD Waiting State */}
          {ussdWaiting && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="relative">
                <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--candle-glow))]" />
                <Smartphone className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[hsl(var(--candle-glow))]" />
              </div>
              <p className="text-sm font-sans font-medium text-center text-foreground">
                En attente de confirmation du paiement…
              </p>
              <p className="text-xs font-sans text-muted-foreground text-center">
                Vérifiez votre téléphone • {45 - elapsedSeconds}s
              </p>
            </div>
          )}

          {/* Timeout State */}
          {ussdTimeout && (
            <div className="flex flex-col items-center gap-3 py-4">
              <AlertTriangle className="w-8 h-8 text-[hsl(var(--candle-glow))]" />
              <p className="text-sm font-sans font-medium text-center text-foreground">
                Aucune réponse reçue
              </p>
              <p className="text-xs font-sans text-muted-foreground text-center leading-relaxed">
                Le paiement n'est pas confirmé. La vérification continue ; aucune nouvelle demande de débit ne sera envoyée.
              </p>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    setUssdTimeout(false);
                    setElapsedSeconds(0);
                  }}
                >
                  <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                  Vérifier le même paiement
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => onOpenChange(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}

          {/* CTA - Hidden during waiting/timeout */}
          {!ussdWaiting && !ussdTimeout && (
            <>
              <Button
                onClick={handleConfirm}
                className={`w-full ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Icon className={`w-4 h-4 mr-2`} />
                )}
                {isMonetized ? `Payer ${displayTotal} XAF` : "Offrir ce geste"}
              </Button>

              {/* Validation feedback: show what's missing when button is disabled */}
              {validationErrors.length > 0 && !submitting && (
                <p className="text-xs text-destructive text-center font-sans">
                  {validationErrors.join(" • ")}
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GesteRituelModal;
