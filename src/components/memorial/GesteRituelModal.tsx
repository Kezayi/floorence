import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flame, Flower2, FlaskConical, Loader2, AlertTriangle, Smartphone, HelpCircle } from "lucide-react";
import { useMonetization } from "@/hooks/useMonetization";
import { toast } from "@/hooks/use-toast";

const FALLBACK_PRICE = 500;

interface GesteRituelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: "cierge" | "fleur";
  postId: string;
  onConfirm: (phone?: string) => Promise<void>;
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

  // Fallback: use loaded price or 500 FCFA if still loading
  const isMonetized = monetization?.isMonetized ?? false;
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

  const isDisabled = submitting || validationErrors.length > 0;

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

  // USSD timeout countdown (45s)
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
      phone: phone.trim() || "(vide)",
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
    try {
      const { data: fresh } = await refetch();
      const currentlyMonetized = fresh?.isMonetized ?? false;
      const currentPrice = fresh?.prices?.[itemType] ?? FALLBACK_PRICE;

      console.log("[GesteRituelModal] After refetch", { currentlyMonetized, currentPrice });

      if (currentlyMonetized && !phone.trim()) {
        console.warn("[GesteRituelModal] Phone missing after refetch in paid mode");
        return;
      }

      // Enter USSD waiting state for paid mode
      if (currentlyMonetized) {
        setUssdWaiting(true);
        setElapsedSeconds(0);
        setUssdTimeout(false);
      }

      await onConfirm(currentlyMonetized ? phone.trim() : undefined);

      // In free mode, close immediately. In paid mode, keep modal open for USSD feedback.
      if (!currentlyMonetized) {
        onOpenChange(false);
        setPhone("");
      }
    } catch (err) {
      console.error("[GesteRituelModal] Error during confirm:", err);
      setUssdWaiting(false);
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
                Envoi de la demande USSD…
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
                Si vous n'avez pas reçu de notification, composez <span className="font-mono font-semibold">*155#</span> ou <span className="font-mono font-semibold">*126#</span> depuis votre téléphone pour valider manuellement.
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
                  Réessayer
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

          {/* Mode Test LAB badge */}
          {isMonetized && !ussdWaiting && !ussdTimeout && (
            <div className="flex items-center justify-center pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-sans font-semibold uppercase tracking-wider rounded-full bg-accent/20 text-accent-foreground border border-accent/30">
                <FlaskConical className="w-3 h-3" />
                Mode Test LAB — DigitechAfrica
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GesteRituelModal;
