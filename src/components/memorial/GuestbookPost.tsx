import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Flame, Flower2 } from "lucide-react";
import { CrossIcon } from "./MemorialIcons";
import { getRelationWithDeceased } from "@/lib/relationshipInference";
import { getRelationCategory } from "@/lib/relationCategoryUtils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AuthorTooltip from "./AuthorTooltip";
import { useAuth } from "@/contexts/AuthContext";
import { displayName } from "@/lib/privacyUtils";
import AuthorAvatar from "./AuthorAvatar";

export interface GuestbookPostData {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  relationCategory: string;
  content: string;
  photos: string[];
  createdAt: string;
  candleCount: number;
  flowerCount: number;
}

interface GuestbookPostProps {
  post: GuestbookPostData;
  isOwner: boolean;
  onAddCandle: (postId: string) => void;
  onAddFlower: (postId: string) => void;
}

/** Category badge color mapping */
const getCategoryBadgeClass = (relation: string): string => {
  const cat = getRelationCategory(relation);
  switch (cat) {
    case "Famille directe": return "bg-foreground/10 text-memorial-dark-foreground";
    case "Famille élargie": return "bg-foreground/10 text-memorial-dark-foreground";
    case "Alliés": return "bg-[hsl(var(--gesture-candle)/0.15)] text-[hsl(var(--gesture-candle))]";
    case "Socio cœur (Amis)": return "bg-[hsl(var(--gesture-flower)/0.15)] text-[hsl(var(--gesture-flower))]";
    case "Autres": return "bg-memorial-dark-muted/20 text-memorial-dark-muted";
  }
};

const GuestbookPost = ({
  post,
  isOwner,
  onAddCandle,
  onAddFlower,
}: GuestbookPostProps) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState(0);
  const [candlePulse, setCandlePulse] = useState(false);
  const [flowerPulse, setFlowerPulse] = useState(false);

  const openLightbox = (index: number) => {
    setLightboxPhotoIndex(index);
    setLightboxOpen(true);
  };

  const nextPhoto = () => {
    setLightboxPhotoIndex((prev) =>
      prev === post.photos.length - 1 ? 0 : prev + 1
    );
  };

  const prevPhoto = () => {
    setLightboxPhotoIndex((prev) =>
      prev === 0 ? post.photos.length - 1 : prev - 1
    );
  };

  const formattedDate = new Date(post.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleCandleClick = () => {
    if (post.candleCount >= 10) return;
    setCandlePulse(true);
    setTimeout(() => setCandlePulse(false), 300);
    onAddCandle(post.id);
  };

  const handleFlowerClick = () => {
    if (post.flowerCount >= 10) return;
    setFlowerPulse(true);
    setTimeout(() => setFlowerPulse(false), 300);
    onAddFlower(post.id);
  };

  const isDeletedUser = !post.authorId || post.authorId === "anonymous";
  const hasCandleFervor = post.candleCount > 5;
  const hasFlowerFervor = post.flowerCount > 5;

  return (
    <article className="py-6 border-b border-memorial-dark-muted/20 last:border-0 animate-fade-in">
      {/* Author info with avatar */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3">
          <AuthorAvatar
            avatarUrl={post.authorAvatarUrl}
            authorName={post.authorName}
            relationCategory={post.relationCategory}
            size="sm"
          />
          <div>
            <AuthorTooltip authorId={post.authorId} authorName={post.authorName}>
              <h4 className="font-serif text-lg text-memorial-dark-foreground cursor-pointer hover:underline decoration-memorial-dark-muted/40 underline-offset-4 transition-all">
                {displayName(post.authorName, isAuthenticated)}
                {isDeletedUser && (
                  <span className="text-memorial-dark-muted ml-1">*</span>
                )}
              </h4>
            </AuthorTooltip>
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-sans rounded-sm ${getCategoryBadgeClass(post.relationCategory)}`}>
              {getRelationWithDeceased(post.relationCategory)}
            </span>
          </div>
        </div>
        <time className="text-xs text-memorial-dark-muted font-sans">
          {formattedDate}
        </time>
      </div>

      {/* Message content */}
      <p className="font-serif text-base leading-relaxed text-memorial-dark-foreground/90 italic mb-4">
        &ldquo;{post.content}&rdquo;
      </p>

      {/* Photo thumbnails */}
      {post.photos.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {post.photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => openLightbox(index)}
              className="w-14 h-14 sm:w-16 sm:h-16 overflow-hidden bg-memorial-dark-muted/20 rounded-sm cursor-pointer hover:opacity-80 hover:ring-1 hover:ring-memorial-dark-foreground/30 transition-all"
            >
              <img
                src={photo}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Gesture buttons with icons and fervor effects */}
      <div className="flex items-center gap-3 mt-4">
        {/* RIP — 1 post = 1 RIP (static) */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-primary/20 text-primary">
          <CrossIcon size={14} className="text-primary" />
          <span className="text-sm font-sans">1 RIP</span>
        </div>

        {/* Candle — with icon and fervor glow */}
        {isOwner && post.candleCount < 10 ? (
          <button
            onClick={handleCandleClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-memorial-dark-muted/20 hover:bg-memorial-dark-muted/30 text-[hsl(var(--gesture-candle))] cursor-pointer ${hasCandleFervor ? 'fervor-glow-candle' : ''}`}
            style={{
              transform: candlePulse ? "scale(1.15)" : "scale(1)",
              transition: "transform 0.2s ease-out, background-color 0.2s",
            }}
          >
            <Flame size={14} className={candlePulse ? "animate-flicker" : ""} />
            <span className="text-sm font-sans">
              {post.candleCount} Cierges
            </span>
          </button>
        ) : (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm ${
              post.candleCount > 0
                ? `bg-memorial-dark-muted/15 text-[hsl(var(--gesture-candle))] ${hasCandleFervor ? 'fervor-glow-candle' : ''}`
                : "bg-memorial-dark-muted/10 text-memorial-dark-muted/60"
            }`}
          >
            <Flame size={14} />
            <span className="text-sm font-sans">
              {post.candleCount} Cierges
            </span>
          </div>
        )}

        {/* Flower — with icon and fervor glow */}
        {isOwner && post.flowerCount < 10 ? (
          <button
            onClick={handleFlowerClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-memorial-dark-muted/20 hover:bg-memorial-dark-muted/30 text-[hsl(var(--gesture-flower))] cursor-pointer ${hasFlowerFervor ? 'fervor-glow-flower' : ''}`}
            style={{
              transform: flowerPulse ? "scale(1.15)" : "scale(1)",
              transition: "transform 0.2s ease-out, background-color 0.2s",
            }}
          >
            <Flower2 size={14} className={flowerPulse ? "animate-flicker" : ""} />
            <span className="text-sm font-sans">
              {post.flowerCount} Fleurs
            </span>
          </button>
        ) : (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm ${
              post.flowerCount > 0
                ? `bg-memorial-dark-muted/15 text-[hsl(var(--gesture-flower))] ${hasFlowerFervor ? 'fervor-glow-flower' : ''}`
                : "bg-memorial-dark-muted/10 text-memorial-dark-muted/60"
            }`}
          >
            <Flower2 size={14} />
            <span className="text-sm font-sans">
              {post.flowerCount} Fleurs
            </span>
          </div>
        )}
      </div>

      {/* Photo Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="bg-black/95 border-none p-0 max-w-[95vw] max-h-[95vh] sm:max-w-4xl">
          <div className="relative flex items-center justify-center min-h-[50vh] sm:min-h-[70vh]">
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>

            {post.photos.length > 1 && (
              <button
                onClick={prevPhoto}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Photo précédente"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            )}

            <img
              src={post.photos[lightboxPhotoIndex]}
              alt={`Photo ${lightboxPhotoIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain px-12 sm:px-16"
            />

            {post.photos.length > 1 && (
              <button
                onClick={nextPhoto}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Photo suivante"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            )}

            {post.photos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-sm font-sans">
                {lightboxPhotoIndex + 1} / {post.photos.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </article>
  );
};

export default GuestbookPost;
