import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flame, Flower2, FlaskConical, Loader2, AlertTriangle, Smartphone, HelpCircle } from "lucide-react";
import { useMonetization } from "@/hooks/useMonetization";

interface GesteRituelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: "cierge" | "fleur";
  postId: string;
  onConfirm: (phone?: string) => Promise<void>;
}

const GesteRituelModal = ({
  open,
  onOpenChange,
  itemType,
  postId,
  onConfirm,
}: GesteRituelModalProps) => {
  const { data: monetization, isLoading: isLoadingSettings, refetch } = useMonetization();
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isMonetized = monetization?.isMonetized ?? false;
  const price = monetization?.prices?.[itemType] ?? 500;

  const Icon = itemType === "cierge" ? Flame : Flower2;
  const label = itemType === "cierge" ? "Cierge" : "Fleur";
  const colorClass = itemType === "cierge" ? "text-gesture-candle" : "text-gesture-flower";

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      // Re-fetch to get latest monetization state
      const { data: fresh } = await refetch();
      const currentlyMonetized = fresh?.isMonetized ?? false;

      if (currentlyMonetized && !phone.trim()) {
        return; // phone required in paid mode
      }

      await onConfirm(currentlyMonetized ? phone.trim() : undefined);
      onOpenChange(false);
      setPhone("");
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
                ? `Ce geste est facturé ${price} FCFA via paiement mobile.`
                : "Ce geste est offert gratuitement."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingSettings ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Price display */}
            <div className="flex items-center justify-between px-4 py-3 rounded-md bg-muted/50">
              <span className="text-sm font-sans">1 × {label}</span>
              <span className="text-lg font-serif font-semibold">
                {isMonetized ? `${price} FCFA` : "Offert"}
              </span>
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

            {/* CTA */}
            <Button
              onClick={handleConfirm}
              disabled={submitting || (isMonetized && !phone.trim())}
              className="w-full"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Icon className={`w-4 h-4 mr-2`} />
              )}
              {isMonetized ? `Payer ${price} FCFA` : "Offrir ce geste"}
            </Button>

            {/* Mode Test LAB badge */}
            {isMonetized && (
              <div className="flex items-center justify-center pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-sans font-semibold uppercase tracking-wider rounded-full bg-accent/20 text-accent-foreground border border-accent/30">
                  <FlaskConical className="w-3 h-3" />
                  Mode Test LAB — DigitechAfrica
                </span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GesteRituelModal;
