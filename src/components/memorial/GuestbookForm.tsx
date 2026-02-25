import { useState, useRef } from "react";
import { ImagePlus, X, Loader2, AlertCircle, CheckCircle, Flame, Flower2, Plus, Minus, Lock } from "lucide-react";
import RelationSelect, { type RelationSelection } from "./RelationSelect";
 import { Button } from "@/components/ui/button";
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

interface GuestbookFormProps {
  memorialId?: string;
  onSubmit: (data: {
    content: string;
    relationCategory: string;
    relationLink: string;
    photos: string[];
    candleCount: number;
    flowerCount: number;
  }) => void | Promise<void>;
  /** If the user already posted on this memorial, lock their relation */
  lockedRelation?: { link: string; category: string };
}

const MAX_PHOTOS = 3;

const GuestbookForm = ({ memorialId, onSubmit, lockedRelation }: GuestbookFormProps) => {
  const { user } = useAuth();
  const { profile, isProfileComplete, loading: profileLoading } = useProfile();
  const { isAdminOrMod } = useAdminRole();
  const [messageContent, setMessageContent] = useState("");
  const [selectedRelation, setSelectedRelation] = useState(lockedRelation?.link || "");
  const [selectedCategory, setSelectedCategory] = useState(lockedRelation?.category || "");
  const [photos, setPhotos] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
  const [candleCount, setCandleCount] = useState(0);
  const [flowerCount, setFlowerCount] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Block non-authenticated users - must sign in to post
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

  // Block users with incomplete profile - must complete profile first
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

  // Block admins/moderators from posting
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

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
    } else if (messageContent.trim().length < 10) {
      newErrors.content = "Votre message doit contenir au moins 10 caractères";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // BETA: Direct submission - no payment required
      await onSubmit({
        content: messageContent.trim(),
        relationCategory: selectedCategory,
        relationLink: selectedRelation,
        photos,
        candleCount,
        flowerCount,
      });

      // Reset form only on success
      setMessageContent("");
      setPhotos([]);
      setCandleCount(0);
      setFlowerCount(0);
      setErrors({});
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error("Une erreur est survenue lors de la publication");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRelationLocked = !!lockedRelation?.link;

  return (
    <>
      <form onSubmit={handleSubmitClick} className="mb-12">
        <div className="space-y-6">
          {/* Relation select — locked after first post */}
          <div>
            {isRelationLocked ? (
              <div className="flex items-center gap-2 p-4 bg-muted/40 border border-border rounded-sm">
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

          <div>
            <textarea
              value={messageContent}
              onChange={(e) => {
                setMessageContent(e.target.value);
                if (errors.content) setErrors((prev) => { const { content, ...rest } = prev; return rest; });
              }}
              placeholder="Partagez un souvenir, un mot de réconfort…"
              rows={5}
              className={`w-full p-5 bg-white/95 border rounded-sm ${errors.content ? 'border-red-500' : 'border-livreor-muted/30'} text-foreground placeholder:text-muted-foreground font-serif resize-none focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-colors`}
            />
            {errors.content && (
              <p className="flex items-center gap-1 text-red-500 text-xs font-sans mt-1">
                <AlertCircle className="w-3 h-3" />
                {errors.content}
              </p>
            )}
          </div>

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
                className="gap-2 bg-white/95 border-livreor-muted/30 text-foreground hover:bg-muted/60 focus:ring-1 focus:ring-primary/30 transition-colors"
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

          {/* Gesture selectors - Free for Beta */}
          <div className="bg-muted/30 border border-border rounded-sm p-5">
            <p className="text-muted-foreground text-sm mb-4 font-serif">
              Accompagnez votre hommage d'un geste symbolique <span className="text-primary font-medium">(gratuit pendant la bêta)</span>
            </p>
            <div className="flex flex-wrap gap-6">
              {/* Candle selector */}
              <div className="flex items-center gap-3">
                <Flame className="w-5 h-5 text-[hsl(var(--gesture-candle))]" />
                <span className="text-foreground text-sm font-medium">Cierges</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCandleCount(Math.max(0, candleCount - 1))}
                    disabled={candleCount === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-sm border border-border bg-white hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <span className="w-8 text-center font-semibold text-foreground tabular-nums">{candleCount}</span>
                  <button
                    type="button"
                    onClick={() => setCandleCount(candleCount + 1)}
                    disabled={candleCount >= 10}
                    className="w-8 h-8 flex items-center justify-center rounded-sm border border-border bg-white hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-foreground" />
                  </button>
                </div>
              </div>

              {/* Flower selector */}
              <div className="flex items-center gap-3">
                <Flower2 className="w-5 h-5 text-[hsl(var(--gesture-flower))]" />
                <span className="text-foreground text-sm font-medium">Fleurs</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFlowerCount(Math.max(0, flowerCount - 1))}
                    disabled={flowerCount === 0}
                    className="w-8 h-8 flex items-center justify-center rounded-sm border border-border bg-white hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5 text-foreground" />
                  </button>
                  <span className="w-8 text-center font-semibold text-foreground tabular-nums">{flowerCount}</span>
                  <button
                    type="button"
                    onClick={() => setFlowerCount(flowerCount + 1)}
                    disabled={flowerCount >= 10}
                    className="w-8 h-8 flex items-center justify-center rounded-sm border border-border bg-white hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-foreground" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 font-serif text-sm tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Publier mon hommage
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Confirmer votre hommage</DialogTitle>
             <DialogDescription className="text-muted-foreground">
               Confirmez la publication de votre message
             </DialogDescription>
          </DialogHeader>

           <div className="space-y-4 py-4">
             <div className="flex items-center justify-center gap-3 py-4">
               <CheckCircle className="w-8 h-8 text-[hsl(var(--accent-green))]" />
               <div>
                 <p className="text-foreground font-medium">Bêta gratuite</p>
                 <p className="text-muted-foreground text-sm">Votre hommage sera publié immédiatement</p>
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
             
             <div className="bg-muted/50 p-3 rounded-sm">
               <p className="text-sm text-muted-foreground line-clamp-2">
                 "{messageContent.trim().substring(0, 100)}{messageContent.length > 100 ? '...' : ''}"
               </p>
             </div>
           </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
               disabled={isSubmitting}
              className="bg-card border-border text-foreground hover:bg-muted"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmSubmit}
               disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
               {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   Publication...
                </>
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
