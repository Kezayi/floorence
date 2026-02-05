 import { useState, useRef } from "react";
import { ImagePlus, X, Loader2, AlertCircle, CheckCircle, Flame, Flower2, Plus, Minus } from "lucide-react";
 import RelationSelect from "./RelationSelect";
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
    photos: string[];
    candleCount: number;
    flowerCount: number;
  }) => void;
}

const MAX_PHOTOS = 3;

const GuestbookForm = ({ memorialId, onSubmit }: GuestbookFormProps) => {
  const { user } = useAuth();
  const { profile, isProfileComplete, loading: profileLoading } = useProfile();
  const { isAdminOrMod } = useAdminRole();
  const [messageContent, setMessageContent] = useState("");
  const [selectedRelation, setSelectedRelation] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
  const [candleCount, setCandleCount] = useState(0);
  const [flowerCount, setFlowerCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Block non-authenticated users - must sign in to post
  if (!user) {
    return (
      <div className="mb-12 p-6 bg-memorial-dark-muted/10 border border-memorial-dark-muted/30 rounded-sm text-center">
        <p className="text-memorial-dark-muted font-serif mb-2">
          Pour participer au maillage et honorer la mémoire, l'identification est requise.
        </p>
        <a 
          href="/auth" 
          className="text-memorial-dark-muted underline hover:text-memorial-dark-foreground transition-colors font-sans text-sm"
        >
          Se connecter
        </a>
      </div>
    );
  }

  // Block users with incomplete profile - must complete profile first
  if (user && !profileLoading && !isProfileComplete) {
    return (
      <div className="mb-12 p-6 bg-memorial-dark-muted/10 border border-memorial-dark-muted/30 rounded-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <p className="text-memorial-dark-foreground font-serif">
            Veuillez compléter votre profil pour rédiger un hommage
          </p>
        </div>
        <a 
          href="/compte" 
          className="inline-block px-6 py-3 bg-memorial-dark-foreground text-memorial-dark hover:bg-memorial-dark-foreground/90 transition-colors font-sans text-sm"
        >
          Compléter mon profil
        </a>
      </div>
    );
  }

  // Block admins/moderators from posting
  if (isAdminOrMod) {
    return (
      <div className="mb-12 p-6 bg-memorial-dark-muted/10 border border-memorial-dark-muted/30 rounded-sm text-center">
        <p className="text-memorial-dark-muted font-serif">
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

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !selectedRelation) return;

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
     setIsSubmitting(true);
     
     // BETA: Direct submission - no payment required
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
    setShowConfirmDialog(false);
     setIsSubmitting(false);
    setCandleCount(0);
    setFlowerCount(0);
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

          {/* Gesture selectors - Free for Beta */}
          <div className="bg-memorial-dark-muted/10 border border-memorial-dark-muted/20 rounded-sm p-4">
            <p className="text-memorial-dark-muted text-sm mb-3 font-serif">
              Accompagnez votre hommage d'un geste symbolique <span className="text-primary">(gratuit pendant la bêta)</span>
            </p>
            <div className="flex flex-wrap gap-4">
              {/* Candle selector */}
              <div className="flex items-center gap-3">
                <Flame className="w-5 h-5 text-amber-500" />
                <span className="text-memorial-dark-foreground text-sm">Cierges</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCandleCount(Math.max(0, candleCount - 1))}
                    disabled={candleCount === 0}
                    className="w-7 h-7 flex items-center justify-center rounded-sm bg-memorial-dark-muted/20 hover:bg-memorial-dark-muted/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-3 h-3 text-memorial-dark-foreground" />
                  </button>
                  <span className="w-8 text-center font-medium text-memorial-dark-foreground">{candleCount}</span>
                  <button
                    type="button"
                    onClick={() => setCandleCount(candleCount + 1)}
                    disabled={candleCount >= 10}
                    className="w-7 h-7 flex items-center justify-center rounded-sm bg-memorial-dark-muted/20 hover:bg-memorial-dark-muted/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-3 h-3 text-memorial-dark-foreground" />
                  </button>
                </div>
              </div>

              {/* Flower selector */}
              <div className="flex items-center gap-3">
                <Flower2 className="w-5 h-5 text-pink-400" />
                <span className="text-memorial-dark-foreground text-sm">Fleurs</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFlowerCount(Math.max(0, flowerCount - 1))}
                    disabled={flowerCount === 0}
                    className="w-7 h-7 flex items-center justify-center rounded-sm bg-memorial-dark-muted/20 hover:bg-memorial-dark-muted/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-3 h-3 text-memorial-dark-foreground" />
                  </button>
                  <span className="w-8 text-center font-medium text-memorial-dark-foreground">{flowerCount}</span>
                  <button
                    type="button"
                    onClick={() => setFlowerCount(flowerCount + 1)}
                    disabled={flowerCount >= 10}
                    className="w-7 h-7 flex items-center justify-center rounded-sm bg-memorial-dark-muted/20 hover:bg-memorial-dark-muted/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-3 h-3 text-memorial-dark-foreground" />
                  </button>
                </div>
              </div>
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
               Confirmez la publication de votre message
             </DialogDescription>
          </DialogHeader>

           <div className="space-y-4 py-4">
             <div className="flex items-center justify-center gap-3 py-4">
               <CheckCircle className="w-8 h-8 text-primary" />
               <div>
                 <p className="text-memorial-dark-foreground font-medium">Bêta gratuite</p>
                 <p className="text-memorial-dark-muted text-sm">Votre hommage sera publié immédiatement</p>
               </div>
             </div>

             {(candleCount > 0 || flowerCount > 0) && (
               <div className="flex justify-center gap-6 py-2">
                 {candleCount > 0 && (
                   <div className="flex items-center gap-2">
                     <Flame className="w-5 h-5 text-amber-500" />
                     <span className="text-memorial-dark-foreground">{candleCount} cierge{candleCount > 1 ? 's' : ''}</span>
                   </div>
                 )}
                 {flowerCount > 0 && (
                   <div className="flex items-center gap-2">
                     <Flower2 className="w-5 h-5 text-pink-400" />
                     <span className="text-memorial-dark-foreground">{flowerCount} fleur{flowerCount > 1 ? 's' : ''}</span>
                   </div>
                 )}
               </div>
             )}
             
             <div className="bg-memorial-dark-muted/10 p-3 rounded-sm">
               <p className="text-sm text-memorial-dark-muted line-clamp-2">
                 "{messageContent.trim().substring(0, 100)}{messageContent.length > 100 ? '...' : ''}"
               </p>
             </div>
           </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
               disabled={isSubmitting}
              className="bg-transparent border-memorial-dark-muted/30 text-memorial-dark-foreground hover:bg-memorial-dark-muted/20"
            >
              Annuler
            </Button>
            <Button
              onClick={handleConfirmSubmit}
               disabled={isSubmitting}
              className="bg-memorial-dark-foreground text-memorial-dark hover:bg-memorial-dark-foreground/90"
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