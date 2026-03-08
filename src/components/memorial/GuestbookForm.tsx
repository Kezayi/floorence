import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, X, Loader2, AlertCircle, CheckCircle, Flame, Flower2, Plus, Minus, Lock, Sparkles } from "lucide-react";
import GesteRituelModal from "./GesteRituelModal";
import RelationSelect, { type RelationSelection } from "./RelationSelect";
import { Button } from "@/components/ui/button";
import TemplateSelector from "./TemplateSelector";
import AITributeGenerator from "./AITributeGenerator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useMonetization } from "@/hooks/useMonetization";

interface GuestbookFormProps {
  memorialId?: string;
  defuntName?: string;
  onSubmit: (data: {
    content: string;
    relationCategory: string;
    relationLink: string;
    photos: string[];
    candleCount: number;
    flowerCount: number;
  }) => void | Promise<void>;
  lockedRelation?: { link: string; category: string };
}

const MAX_PHOTOS = 3;

const GuestbookForm = ({ memorialId, defuntName, onSubmit, lockedRelation }: GuestbookFormProps) => {
  const { user } = useAuth();
  const { profile, isProfileComplete, loading: profileLoading } = useProfile();
  const { isAdminOrMod } = useAdminRole();
  const { data: monetization } = useMonetization();
  const isMonetized = monetization?.isMonetized ?? false;
  const priceCierge = monetization?.prices?.cierge ?? 500;
  const priceFleur = monetization?.prices?.fleur ?? 500;
  const [messageContent, setMessageContent] = useState("");
  const [selectedRelation, setSelectedRelation] = useState(lockedRelation?.link || "Ami(e) / Connaissance");
  const [selectedCategory, setSelectedCategory] = useState(lockedRelation?.category || "Socio-cœur");
  const [photos, setPhotos] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showEbillingModal, setShowEbillingModal] = useState(false);
  const [pendingPostId, setPendingPostId] = useState<string>("");
  const [lastSubmittedData, setLastSubmittedData] = useState<{ candleCount: number; flowerCount: number; relation: string; totalAmount: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [candleCount, setCandleCount] = useState(0);
  const [flowerCount, setFlowerCount] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const relationRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLDivElement>(null);

  // Block non-authenticated users
  if (!user) {
    return (
      <div className="mb-12 p-6 bg-muted/40 border border-border rounded-sm text-center">
        <p className="text-muted-foreground font-serif mb-2">
          Pour participer au maillage et honorer la mémoire, l'identification est requise.
        </p>
        <a 
          href="/auth" 
          className="text-foreground underline hover:text-primary transition-colors font-sans text-sm"
        >
          Se connecter
        </a>
      </div>
    );
  }

  // Block incomplete profile
  if (user && !profileLoading && !isProfileComplete) {
    return (
      <div className="mb-12 p-6 bg-muted/40 border border-border rounded-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <p className="text-foreground font-serif">
            Veuillez compléter votre profil pour rédiger un hommage
          </p>
        </div>
        <a 
          href="/compte" 
          className="inline-block px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-sans text-sm rounded-sm"
        >
          Compléter mon profil
        </a>
      </div>
    );
  }

  // Block admins
  if (isAdminOrMod) {
    return (
      <div className="mb-12 p-6 bg-muted/40 border border-border rounded-sm text-center">
        <p className="text-muted-foreground font-serif">
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedRelation) {
      newErrors.relation = "Veuillez sélectionner votre lien de parenté avec le défunt";
    }
    if (!messageContent.trim()) {
      newErrors.content = "Veuillez rédiger votre message d'hommage";
    } else if (messageContent.trim().length < 5) {
      newErrors.content = "Votre message doit contenir au moins 5 caractères";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Form Validation]', { selectedRelation, messageLength: messageContent.trim().length, selectedCategory });
    if (!validateForm()) {
      toast.error('Veuillez vérifier les champs obligatoires (relation et message d\'au moins 5 caractères)');
      // Scroll to first error
      if (!selectedRelation && relationRef.current) {
        relationRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (textareaRef.current) {
        textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    // Close mobile keyboard before opening confirmation modal
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setShowConfirmDialog(true);
    console.log('[Tunnel Success]', { target: 'eBilling Modal' });
  };

  const handleConfirmSubmit = async () => {
    // ── PAID MODE: intercept and redirect to eBilling modal ──
    if (isMonetized) {
      console.log('[Redirect Audit]', { action: 'Open eBilling Modal', isMonetized });
      setShowConfirmDialog(false);
      toast.info('Préparation du paiement sécurisé...');
      // Use memorialId as postId context for the eBilling modal
      setPendingPostId(memorialId || "");
      setShowEbillingModal(true);
      return;
    }

    // ── FREE MODE: submit directly ──
    setIsSubmitting(true);
    const snapshot = {
      candleCount,
      flowerCount,
      relation: selectedRelation,
      totalAmount,
    };
    
    try {
      await onSubmit({
        content: messageContent.trim(),
        relationCategory: selectedCategory,
        relationLink: selectedRelation,
        photos,
        candleCount,
        flowerCount,
      });

      setLastSubmittedData(snapshot);

      setMessageContent("");
      setPhotos([]);
      setCandleCount(0);
      setFlowerCount(0);
      setErrors({});
      setShowConfirmDialog(false);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error("Une erreur est survenue lors de la publication");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEbillingConfirm = async (phone?: string) => {
    console.log('[eBilling Confirm]', { phone, memorialId, defuntName, candleCount, flowerCount, totalAmount });
    const snapshot = {
      candleCount,
      flowerCount,
      relation: selectedRelation,
      totalAmount,
    };

    try {
      // 1. Submit the post first (it will be hidden via publish-tribute)
      await onSubmit({
        content: messageContent.trim(),
        relationCategory: selectedCategory,
        relationLink: selectedRelation,
        photos,
        candleCount,
        flowerCount,
      });

      // 2. Call the ebilling edge function to initiate payment with the operator
      if (memorialId && user) {
        const itemType = candleCount > 0 ? 'cierge' : 'fleur';
        const quantity = candleCount > 0 ? candleCount : flowerCount;

        console.log('[eBilling] Calling edge function...', { memorialId, itemType, quantity, phone });
        const { data: ebillingData, error: ebillingErr } = await supabase.functions.invoke('ebilling', {
          body: {
            memorial_id: memorialId,
            item_type: itemType,
            quantity,
            phone: phone || undefined,
            deceased_name: defuntName || undefined,
            candle_count: candleCount,
            flower_count: flowerCount,
          },
        });

        if (ebillingErr) {
          console.error('[eBilling] Edge function error:', ebillingErr);
          // Extract real error from FunctionsHttpError context
          let errorMsg = 'Erreur inconnue';
          try {
            if (ebillingErr.context && typeof ebillingErr.context.json === 'function') {
              const ctx = await ebillingErr.context.json();
              errorMsg = ctx?.error || ctx?.message || JSON.stringify(ctx);
            } else {
              errorMsg = ebillingData?.error || ebillingErr.message || JSON.stringify(ebillingErr);
            }
          } catch {
            errorMsg = ebillingData?.error || ebillingErr.message || 'Erreur de communication';
          }
          toast.error(`Erreur paiement : ${errorMsg}`, { duration: 10000 });
        } else if (ebillingData?.error) {
          console.error('[eBilling] API error:', ebillingData);
          const details = ebillingData.details || '';
          const isHtml = details.includes('<!DOCTYPE') || details.includes('<html');
          if (isHtml) {
            toast.error("ERREUR CRITIQUE : L'opérateur renvoie une page HTML au lieu d'une réponse API. Vérifiez l'URL ou le Merchant ID.", { duration: 15000 });
          } else {
            toast.error(`Erreur Opérateur : ${ebillingData.error}`, { duration: 10000 });
          }
        } else {
          console.log('[eBilling] Edge function response:', ebillingData);

          // If checkout URL is provided, redirect in same window (avoids popup blockers)
          const checkoutUrl = ebillingData?.ebilling_response?.ppiUrlCheckout;
          if (checkoutUrl) {
            console.log('[eBilling] Redirecting to checkout:', checkoutUrl);
            window.location.href = checkoutUrl;
            return; // Don't clear form — user will navigate away
          }

          // For USSD flow (no redirect URL), show success
          if (ebillingData?.success && ebillingData?.mode === 'gratuit') {
            toast.success(ebillingData.message || "Geste offert avec succès");
          } else if (ebillingData?.success) {
            toast.info("Demande envoyée. Validez le paiement sur votre téléphone.", { duration: 10000 });
          }
        }
      }

      setLastSubmittedData(snapshot);
      setMessageContent("");
      setPhotos([]);
      setCandleCount(0);
      setFlowerCount(0);
      setErrors({});
      setShowEbillingModal(false);
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('[eBilling Post Submit] error:', error);
      toast.error("Erreur lors de la publication après paiement");
    }
  };

  const isRelationLocked = !!lockedRelation?.link;
  const showFlowerSuggestion = messageContent.length > 200 && flowerCount === 0;
  const totalAmount = (candleCount * priceCierge) + (flowerCount * priceFleur);

  return (
    <>
      <form onSubmit={handleSubmitClick} className="mb-12">
        <div className="space-y-6">
          {/* Relation select */}
          <div ref={relationRef}>
            {isRelationLocked ? (
              <div className="flex items-center gap-2 p-4 bg-white border border-[hsl(0,0%,75%)] rounded-sm">
                <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground font-serif text-sm">
                  {lockedRelation.link}
                </span>
                <span className="text-muted-foreground text-xs font-sans ml-auto">
                  Lien verrouillé
                </span>
              </div>
            ) : (
              <>
                <RelationSelect
                  value={selectedRelation}
                  onChange={(sel: RelationSelection) => {
                    setSelectedRelation(sel.link);
                    setSelectedCategory(sel.category);
                    setErrors((prev) => { const { relation, ...rest } = prev; return rest; });
                  }}
                />
                {errors.relation && (
                  <p className="flex items-center gap-1 text-red-500 text-xs font-sans mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.relation}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Writing assistance */}
          <div className="flex flex-wrap gap-2">
            <TemplateSelector
              defuntName={defuntName}
              onSelect={(text) => {
              setMessageContent(text);
              if (errors.content) setErrors((prev) => { const { content, ...rest } = prev; return rest; });
            }} />
            {defuntName && (
              <AITributeGenerator
                defuntName={defuntName}
                onGenerated={(text) => {
                  setMessageContent(text);
                  if (errors.content) setErrors((prev) => { const { content, ...rest } = prev; return rest; });
                }}
              />
            )}
          </div>

          {/* Textarea */}
          <div ref={textareaRef}>
            <textarea
              value={messageContent}
              onChange={(e) => {
                setMessageContent(e.target.value);
                if (errors.content) setErrors((prev) => { const { content, ...rest } = prev; return rest; });
              }}
              placeholder="Partagez un souvenir, un mot de réconfort…"
              rows={5}
              className={`w-full p-5 bg-white border rounded-sm ${errors.content ? 'border-red-500' : 'border-[hsl(0,0%,75%)]'} text-foreground placeholder:text-muted-foreground font-serif resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-colors`}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.content ? (
                <p className="flex items-center gap-1 text-destructive text-xs font-sans">
                  <AlertCircle className="w-3 h-3" />
                  {errors.content}
                </p>
              ) : <span />}
              <span className={`text-xs font-sans tabular-nums ${messageContent.trim().length < 5 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {messageContent.trim().length}/5 min
              </span>
            </div>
          </div>

          {/* Flower suggestion for long messages */}
          {showFlowerSuggestion && (
            <div className="flex items-start gap-3 p-4 bg-[hsl(340,30%,97%)] border border-[hsl(340,30%,85%)] rounded-sm animate-fade-in">
              <Sparkles className="w-4 h-4 text-[hsl(var(--gesture-flower))] mt-0.5 flex-shrink-0" />
              <p className="text-sm font-serif text-[hsl(0,0%,35%)] italic">
                Un témoignage si précieux mérite un bel accompagnement. Souhaitez-vous ajouter un bouquet de fleurs ?
              </p>
              <button
                type="button"
                onClick={() => setFlowerCount(1)}
                className="flex-shrink-0 px-3 py-1 text-xs font-sans bg-[hsl(340,30%,92%)] text-[hsl(340,60%,45%)] rounded-sm hover:bg-[hsl(340,30%,88%)] transition-colors"
              >
                + 1 Fleur
              </button>
            </div>
          )}

          {/* Photo upload */}
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
                className="gap-2 bg-white border-[hsl(0,0%,75%)] text-foreground hover:bg-muted/60 focus:ring-1 focus:ring-primary/30 transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
                Ajouter des photos ({photos.length}/{MAX_PHOTOS})
              </Button>
            </div>

            {photos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {photos.map((photo, index) => (
                  <div key={index} className="relative w-20 h-20 overflow-hidden rounded-sm group">
                    <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
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

          {/* Gesture selectors — Precious buttons */}
          <div className="bg-white border border-[hsl(0,0%,88%)] rounded-sm p-6">
            <p className="text-muted-foreground text-sm mb-5 font-serif">
              Accompagnez votre hommage d'un geste symbolique <span className="text-primary font-medium">(gratuit pendant la bêta)</span>
            </p>
            <div className="flex flex-wrap gap-8">
              {/* Candle — Precious amber */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm border border-[hsl(45,70%,70%)] bg-[hsl(45,80%,96%)] flex items-center justify-center shadow-[inset_0_1px_0_hsl(45,80%,98%),0_1px_3px_hsl(45,60%,80%)]">
                  <Flame className="w-5 h-5 text-[hsl(var(--gesture-candle))]" />
                </div>
                <span className="text-foreground text-sm font-medium font-serif">Cierges</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCandleCount(Math.max(0, candleCount - 1))}
                    disabled={candleCount === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-sm border border-[hsl(0,0%,75%)] bg-white hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <span className="w-8 text-center font-semibold text-foreground tabular-nums">{candleCount}</span>
                  <button
                    type="button"
                    onClick={() => setCandleCount(candleCount + 1)}
                    disabled={candleCount >= 10}
                    className="w-8 h-8 flex items-center justify-center rounded-sm border border-[hsl(0,0%,75%)] bg-white hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-foreground" />
                  </button>
                </div>
              </div>

              {/* Flower — Precious rose */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm border border-[hsl(340,40%,80%)] bg-[hsl(340,30%,97%)] flex items-center justify-center shadow-[inset_0_1px_0_hsl(340,30%,98%),0_1px_3px_hsl(340,30%,85%)]">
                  <Flower2 className="w-5 h-5 text-[hsl(var(--gesture-flower))]" />
                </div>
                <span className="text-foreground text-sm font-medium font-serif">Fleurs</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFlowerCount(Math.max(0, flowerCount - 1))}
                    disabled={flowerCount === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-sm border border-[hsl(0,0%,75%)] bg-white hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <span className="w-8 text-center font-semibold text-foreground tabular-nums">{flowerCount}</span>
                  <button
                    type="button"
                    onClick={() => setFlowerCount(flowerCount + 1)}
                    disabled={flowerCount >= 10}
                    className="w-8 h-8 flex items-center justify-center rounded-sm border border-[hsl(0,0%,75%)] bg-white hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-foreground" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 font-serif text-sm tracking-wide rounded-sm transition-colors duration-300 text-white ${
              isMonetized
                ? 'bg-submit-paid hover:bg-submit-paid-hover'
                : 'bg-submit-free hover:bg-submit-free-hover'
            } ${
              (!selectedRelation || messageContent.trim().length < 5 || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Envoi en cours…' : (isMonetized ? 'Procéder au paiement' : 'Publier gratuitement')}
          </button>
        </div>
      </form>

      {/* Confirmation Dialog (pre-publish) */}
      <Dialog open={showConfirmDialog} onOpenChange={(open) => {
        setShowConfirmDialog(open);
        if (open) console.log('[ConfirmDialog State]', { mode: isMonetized ? 'PAYANT' : 'GRATUIT' });
      }}>
        <DialogContent className="bg-white border-[hsl(0,0%,85%)] text-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Confirmer votre hommage</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isMonetized ? `Vous allez être redirigé vers le paiement sécurisé (${totalAmount} XAF)` : 'Confirmez la publication de votre message'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-3 py-4">
              <CheckCircle className={`w-8 h-8 ${isMonetized ? 'text-foreground' : 'text-[hsl(var(--accent-green))]'}`} />
              <div>
                <p className="text-foreground font-medium">{isMonetized ? 'Hommage Protégé' : 'Bêta gratuite'}</p>
                <p className="text-muted-foreground text-sm">{isMonetized ? `Montant total : ${totalAmount} XAF` : 'Votre hommage sera publié immédiatement'}</p>
              </div>
            </div>

            {(candleCount > 0 || flowerCount > 0) && (
              <div className="flex justify-center gap-6 py-2">
                {candleCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-[hsl(var(--gesture-candle))]" />
                    <span className="text-foreground">{candleCount} cierge{candleCount > 1 ? 's' : ''}</span>
                  </div>
                )}
                {flowerCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Flower2 className="w-5 h-5 text-[hsl(var(--gesture-flower))]" />
                    <span className="text-foreground">{flowerCount} fleur{flowerCount > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="bg-[hsl(0,0%,97%)] border border-[hsl(0,0%,90%)] p-3 rounded-sm">
              <p className="text-sm text-muted-foreground line-clamp-2 font-serif italic">
                "{messageContent.trim().substring(0, 100)}{messageContent.length > 100 ? '...' : ''}"
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
              className="bg-white border-[hsl(0,0%,75%)] text-foreground hover:bg-muted"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              className={`text-white transition-colors duration-300 ${isMonetized ? 'bg-submit-paid hover:bg-submit-paid-hover' : 'bg-submit-free hover:bg-submit-free-hover'}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isMonetized ? 'Redirection…' : 'Publication...'}
                </>
              ) : (
                isMonetized ? 'Procéder au paiement' : 'Publier'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog (post-publish receipt) */}
      <Dialog open={showSuccessDialog} onOpenChange={(open) => {
        setShowSuccessDialog(open);
        if (open && lastSubmittedData) {
          console.log('[Success Summary Audit]', lastSubmittedData);
        }
      }}>
      <DialogContent className="bg-white border-[hsl(0,0%,85%)] text-foreground max-w-md animate-fade-in">
          <div className="text-center py-6 space-y-5">
            {/* Elegant check icon */}
            <div className="w-16 h-16 mx-auto rounded-full bg-[hsl(142,70%,95%)] flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-[hsl(var(--accent-green))]" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-serif text-xl text-foreground">
                Votre message a été déposé avec respect
              </h3>
              <p className="text-sm text-muted-foreground font-sans">
                Merci d'honorer cette mémoire avec dignité.
              </p>
            </div>

            {/* Receipt summary */}
            {lastSubmittedData && (lastSubmittedData.candleCount > 0 || lastSubmittedData.flowerCount > 0) && (
              <div className="border border-[hsl(0,0%,90%)] rounded-sm p-4 mx-4 bg-[hsl(0,0%,99%)]">
                <p className="text-xs font-sans text-muted-foreground uppercase tracking-wider mb-3">Récapitulatif</p>
                <div className="flex justify-center gap-6">
                  {lastSubmittedData.candleCount > 0 && (
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-[hsl(var(--gesture-candle))]" />
                      <span className="text-sm text-foreground">{lastSubmittedData.candleCount} cierge{lastSubmittedData.candleCount > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {lastSubmittedData.flowerCount > 0 && (
                    <div className="flex items-center gap-2">
                      <Flower2 className="w-4 h-4 text-[hsl(var(--gesture-flower))]" />
                      <span className="text-sm text-foreground">{lastSubmittedData.flowerCount} fleur{lastSubmittedData.flowerCount > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-[hsl(0,0%,92%)]">
                  <p className="text-xs text-muted-foreground font-sans">
                    Total : <span className="font-medium text-foreground">{lastSubmittedData.totalAmount > 0 ? `${lastSubmittedData.totalAmount} XAF` : '0 XAF'}</span> {lastSubmittedData.totalAmount === 0 && <span className="italic">(bêta gratuite)</span>}
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* eBilling Payment Modal (paid mode) */}
      <GesteRituelModal
        open={showEbillingModal}
        onOpenChange={setShowEbillingModal}
        itemType="cierge"
        postId={pendingPostId}
        onConfirm={handleEbillingConfirm}
        candleCount={candleCount}
        flowerCount={flowerCount}
        totalAmount={totalAmount}
        priceCierge={priceCierge}
        priceFleur={priceFleur}
      />
    </>
  );
};

export default GuestbookForm;
