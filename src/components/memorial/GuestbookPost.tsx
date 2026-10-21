import { useState, memo } from "react";
import { ChevronLeft, ChevronRight, X, Flame, Flower2, Heart } from "lucide-react";
import { CrossIcon } from "./MemorialIcons";
import { getRelationWithDeceased } from "@/lib/relationshipInference";
import { formatRelationLabel } from "@/lib/formatRelationLabel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AuthorTooltip from "./AuthorTooltip";
import { useAuth } from "@/contexts/AuthContext";
import { displayName } from "@/lib/privacyUtils";
import { getOptimizedImageUrl, getOptimizedSrcSet } from "@/lib/imageUrl";
import AuthorAvatar from "./AuthorAvatar";
import CountryFlag from "./CountryFlag";
import { countryName } from "@/lib/geoLands";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ContributorRelationalSheet, { useRelationalEligibility } from "./ContributorRelationalSheet";

export interface GuestbookPostData {
  id: string;
  /** Memorial the post belongs to (server-side Voir+ check is scoped to it) */
  memorialId?: string;
  authorId: string;
  /** Raw user UUID for business logic (nullable for anonymous/demo) */
  authorUserId?: string | null;
  authorName: string;
  authorAvatarUrl?: string | null;
  relationCategory: string;
  relationLink?: string | null;
  content: string;
  photos: string[];
  createdAt: string;
  candleCount: number;
  flowerCount: number;
  /** GEO-02: country shown only with the author's explicit public consent */
  authorCountryCode?: string | null;
}

interface GuestbookPostProps {
  post: GuestbookPostData;
  isOwner: boolean;
  deceasedGender?: 'male' | 'female';
  onAddCandle: (postId: string) => void;
  onAddFlower: (postId: string) => void;
  deceasedName?: string;
}

/* Relation label: no background, italic muted text */

const GuestbookPost = ({
  post,
  isOwner,
  deceasedGender = 'male',
  onAddCandle,
  onAddFlower,
  deceasedName = "",
}: GuestbookPostProps) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotoIndex, setLightboxPhotoIndex] = useState(0);
  const [candlePulse, setCandlePulse] = useState(false);
  const [flowerPulse, setFlowerPulse] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [countryCode, setCountryCode] = useState<string | null>(post.authorCountryCode ?? null);
  const withdrawCountry = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("withdraw_tribute_country", { p_post_id: post.id });
    if (error || !data) { toast.error("Le pays n'a pas pu être retiré"); return; }
    setCountryCode(null);
    toast.success("Le pays n'est plus affiché avec cet hommage");
  };
  const { data: canViewProfile } = useRelationalEligibility(post.memorialId);

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
    <article className="py-6 animate-fade-in">
      {profileOpen && (
        <ContributorRelationalSheet postId={post.id} deceasedName={deceasedName} onClose={() => setProfileOpen(false)} />
      )}
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
              <h4 className="font-serif text-lg text-livreor-foreground cursor-pointer hover:underline decoration-livreor-muted/40 underline-offset-4 transition-all flex items-center gap-2">
                {canViewProfile && post.authorUserId ? (
                  <button type="button" onClick={() => setProfileOpen(true)} className="font-serif hover:underline decoration-accent underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm" aria-label={`Ouvrir la fiche relationnelle de ${post.authorName}`}>
                    {displayName(post.authorName, isAuthenticated)}
                  </button>
                ) : displayName(post.authorName, isAuthenticated)}
                {isDeletedUser && (
                  <span className="text-livreor-muted ml-1">*</span>
                )}
                {(post.candleCount > 0 || post.flowerCount > 0) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wider rounded-full bg-[hsl(var(--gesture-candle))/0.15] text-[hsl(var(--gesture-candle))]">
                    <Heart className="w-3 h-3" />
                    Donateur
                  </span>
                )}
              </h4>
            </AuthorTooltip>
            <span className="block mt-0.5 text-[11px] font-sans italic text-livreor-muted">
              {formatRelationLabel(post.relationLink || post.relationCategory, deceasedGender)}
              <span className="sr-only"> (lien déclaré par l'auteur)</span>
            </span>
            {countryCode && (
              <span className="mt-1 flex items-center gap-1.5 text-[11px] font-sans text-livreor-muted">
                <CountryFlag code={countryCode} size="md" fallback />
                <span>{countryName(countryCode)}</span>
                {isOwner && (
                  <button type="button" onClick={withdrawCountry} className="ml-1 underline underline-offset-2 hover:text-livreor-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm">
                    Retirer
                  </button>
                )}
              </span>
            )}
          </div>
        </div>
        <time className="text-xs text-livreor-muted font-sans">
          {formattedDate}
        </time>
      </div>

      {/* Message content */}
      <p className="font-serif text-base leading-relaxed text-livreor-foreground italic mb-4">
        &ldquo;{post.content}&rdquo;
      </p>

      {/* Photo thumbnails */}
      {post.photos.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {post.photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => openLightbox(index)}
              className="w-14 h-14 sm:w-16 sm:h-16 overflow-hidden bg-livreor-muted/20 rounded-sm cursor-pointer hover:opacity-80 hover:ring-1 hover:ring-livreor-foreground/30 transition-all"
            >
              <img
                src={getOptimizedImageUrl(photo, { width: 64, height: 64 })}
                srcSet={getOptimizedSrcSet(photo, { width: 64, height: 64 })}
                alt={`Photo ${index + 1}`}
                width={64}
                height={64}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-livreor-muted/20 hover:bg-livreor-muted/30 text-[hsl(var(--gesture-candle))] cursor-pointer ${hasCandleFervor ? 'fervor-glow-candle' : ''}`}
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
                ? `bg-livreor-muted/15 text-[hsl(var(--gesture-candle))] ${hasCandleFervor ? 'fervor-glow-candle' : ''}`
                : "bg-livreor-muted/10 text-livreor-muted/60"
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-livreor-muted/20 hover:bg-livreor-muted/30 text-[hsl(var(--gesture-flower))] cursor-pointer ${hasFlowerFervor ? 'fervor-glow-flower' : ''}`}
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
                ? `bg-livreor-muted/15 text-[hsl(var(--gesture-flower))] ${hasFlowerFervor ? 'fervor-glow-flower' : ''}`
                : "bg-livreor-muted/10 text-livreor-muted/60"
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

export default memo(GuestbookPost);
