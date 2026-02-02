import { useState, useRef } from "react";
import { ImagePlus, X, Plus, Minus, Loader2 } from "lucide-react";
import RelationSelect from "./RelationSelect";
import { Button } from "@/components/ui/button";
import { FlameIcon, ChrysanthemumIcon } from "./MemorialIcons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { initiatePayment } from "@/lib/paymentService";
import { toast } from "sonner";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useAdminRole } from "@/hooks/useAdminRole";

interface GuestbookFormProps {
  memorialId?: string;
  onSubmit: (data: {
    content: string;
    relationCategory: string;
    photos: string[];
    candleCount: number;
    flowerCount: number;
  }) => void;
}

const MAX_PHOTOS = 3;

const GuestbookForm = ({ memorialId, onSubmit }: GuestbookFormProps) => {
  const { user } = useAuth();
  const { data: settings } = useSystemSettings();
  const { isAdminOrMod } = useAdminRole();
  const [messageContent, setMessageContent] = useState("");
  const [selectedRelation, setSelectedRelation] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [candleCount, setCandleCount] = useState(0);
  const [flowerCount, setFlowerCount] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CANDLE_PRICE = settings?.candle_price?.amount ?? 500;
  const FLOWER_PRICE = settings?.flower_price?.amount ?? 1000;

  // Block admins/moderators from posting
  if (isAdminOrMod) {
    return (
      <div className="mb-12 p-6 bg-memorial-dark-muted/10 border border-memorial-dark-muted/30 rounded-sm">
        <p className="text-memorial-dark-muted text-center font-serif">
          En tant qu'administrateur ou modérateur, vous ne pouvez pas rédiger d'hommage avec ce compte.
        </p>
      </div>
    );
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = MAX_PHOTOS - photos.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = candleCount * CANDLE_PRICE + flowerCount * FLOWER_PRICE;

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !selectedRelation) return;

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    // If there's a payment required, initiate it first
    if (totalAmount > 0) {
      if (!user) {
        toast.error("Vous devez être connecté pour effectuer un paiement");
        setShowConfirmDialog(false);
        return;
      }

      setIsProcessingPayment(true);
      
      try {
        const response = await initiatePayment({
          amount: totalAmount,
          paymentType: 'tribute',
          memorialId: memorialId,
          metadata: {
            candleCount,
            flowerCount,
            relationCategory: selectedRelation,
            messagePreview: messageContent.substring(0, 100)
          }
        });

        if (response.success && response.paymentUrl) {
          // Store form data in sessionStorage before redirecting
          sessionStorage.setItem('pendingTribute', JSON.stringify({
            content: messageContent.trim(),
            relationCategory: selectedRelation,
            photos,
            candleCount,
            flowerCount,
            reference: response.reference,
            memorialId: memorialId
          }));
          
          // Redirect to payment page
          window.location.href = response.paymentUrl;
          return;
        } else {
          toast.error(response.error || "Erreur lors de l'initiation du paiement");
          setIsProcessingPayment(false);
        }
      } catch (error) {
        console.error('Payment error:', error);
        toast.error("Une erreur est survenue lors du paiement");
        setIsProcessingPayment(false);
      }
      return;
    }

    // No payment required, submit directly
    onSubmit({
      content: messageContent.trim(),
      relationCategory: selectedRelation,
      photos,
      candleCount,
      flowerCount,
    });

    // Reset form
    setMessageContent("");
    setSelectedRelation("");
    setPhotos([]);
    setCandleCount(0);
    setFlowerCount(0);
    setShowConfirmDialog(false);
  };

  const canSubmit = messageContent.trim() && selectedRelation;

  return (
    <>
      <form onSubmit={handleSubmitClick} className="mb-12">
        <div className="space-y-4">
          <RelationSelect value={selectedRelation} onChange={setSelectedRelation} />

          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Votre message..."
            rows={4}
            className="w-full p-4 bg-memorial-dark border border-memorial-dark-muted/30 text-memorial-dark-foreground placeholder:text-memorial-dark-muted font-serif resize-none focus:outline-none focus:ring-1 focus:ring-memorial-dark-foreground/30"
          />

          {/* Photo upload section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={photos.length >= MAX_PHOTOS}
                className="gap-2 bg-transparent border-memorial-dark-muted/30 text-memorial-dark-foreground hover:bg-memorial-dark-muted/20"
              >
                <ImagePlus className="w-4 h-4" />
                Ajouter des photos ({photos.length}/{MAX_PHOTOS})
              </Button>
            </div>

            {/* Photo preview grid */}
            {photos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative w-20 h-20 overflow-hidden rounded-sm group"
                  >
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Supprimer la photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Candles and Flowers selection */}
          <div className="flex flex-wrap gap-4 pt-2">
            {/* Candles */}
            <div className="flex items-center gap-3 bg-memorial-dark-muted/10 border border-memorial-dark-muted/20 rounded-sm px-4 py-3">
              <FlameIcon size={24} />
              <span className="text-memorial-dark-foreground font-serif">Allumer Cierges</span>
              <div className="flex items-center gap-2 ml-2">
                <button
                  type="button"
                  onClick={() => setCandleCount(Math.max(0, candleCount - 1))}
                  disabled={candleCount === 0}
                  className="p-1 rounded-full bg-memorial-dark-muted/20 hover:bg-memorial-dark-muted/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-4 h-4 text-memorial-dark-foreground" />
                </button>
                <span className="w-8 text-center text-memorial-dark-foreground font-medium">
                  {candleCount}
                </span>
                <button
                  type="button"
                  onClick={() => setCandleCount(candleCount + 1)}
                  className="p-1 rounded-full bg-memorial-dark-muted/20 hover:bg-memorial-dark-muted/40 transition-colors"
                >
                  <Plus className="w-4 h-4 text-memorial-dark-foreground" />
                </button>
              </div>
              <span className="text-xs text-memorial-dark-muted ml-2">
                {CANDLE_PRICE} FCFA/u
              </span>
            </div>

            {/* Flowers */}
            <div className="flex items-center gap-3 bg-memorial-dark-muted/10 border border-memorial-dark-muted/20 rounded-sm px-4 py-3">
              <ChrysanthemumIcon size={24} />
              <span className="text-memorial-dark-foreground font-serif">Fleurir l'Espace</span>
              <div className="flex items-center gap-2 ml-2">
                <button
                  type="button"
                  onClick={() => setFlowerCount(Math.max(0, flowerCount - 1))}
                  disabled={flowerCount === 0}
                  className="p-1 rounded-full bg-memorial-dark-muted/20 hover:bg-memorial-dark-muted/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-4 h-4 text-memorial-dark-foreground" />
                </button>
                <span className="w-8 text-center text-memorial-dark-foreground font-medium">
                  {flowerCount}
                </span>
                <button
                  type="button"
                  onClick={() => setFlowerCount(flowerCount + 1)}
                  className="p-1 rounded-full bg-memorial-dark-muted/20 hover:bg-memorial-dark-muted/40 transition-colors"
                >
                  <Plus className="w-4 h-4 text-memorial-dark-foreground" />
                </button>
              </div>
              <span className="text-xs text-memorial-dark-muted ml-2">
                {FLOWER_PRICE} FCFA/u
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-memorial bg-memorial-dark-foreground text-memorial-dark hover:bg-memorial-dark-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Publier mon hommage
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-memorial-dark border-memorial-dark-muted/30 text-memorial-dark-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Confirmer votre hommage</DialogTitle>
            <DialogDescription className="text-memorial-dark-muted">
              Récapitulatif de votre contribution
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between py-2 border-b border-memorial-dark-muted/20">
              <span className="text-memorial-dark-muted">Message d'hommage</span>
              <span className="text-memorial-dark-foreground">1 RIP inclus</span>
            </div>

            {candleCount > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-memorial-dark-muted/20">
                <div className="flex items-center gap-2">
                  <FlameIcon size={20} />
                  <span>{candleCount} Cierge{candleCount > 1 ? "s" : ""}</span>
                </div>
                <span>{candleCount * CANDLE_PRICE} FCFA</span>
              </div>
            )}

            {flowerCount > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-memorial-dark-muted/20">
                <div className="flex items-center gap-2">
                  <ChrysanthemumIcon size={20} />
                  <span>{flowerCount} Fleur{flowerCount > 1 ? "s" : ""}</span>
                </div>
                <span>{flowerCount * FLOWER_PRICE} FCFA</span>
              </div>
            )}

            {totalAmount > 0 && (
              <div className="flex items-center justify-between pt-4 border-t border-memorial-dark-muted/40">
                <span className="font-semibold text-lg">Total à payer</span>
                <span className="font-bold text-lg text-primary">{totalAmount} FCFA</span>
              </div>
            )}

            {totalAmount === 0 && (
              <p className="text-memorial-dark-muted text-sm text-center py-2">
                Aucun paiement requis pour cet hommage
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isProcessingPayment}
              className="bg-transparent border-memorial-dark-muted/30 text-memorial-dark-foreground hover:bg-memorial-dark-muted/20"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={isProcessingPayment}
              className="bg-memorial-dark-foreground text-memorial-dark hover:bg-memorial-dark-foreground/90"
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : totalAmount > 0 ? (
                `Payer ${totalAmount} FCFA`
              ) : (
                "Publier"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GuestbookForm;