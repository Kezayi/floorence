import React, { useState, useEffect } from "react";
import ProgressiveImage from "@/components/ui/ProgressiveImage";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Feather } from "lucide-react";
import { getRelationWithDeceased } from "@/lib/relationshipInference";
import ShareButtons from "./ShareButtons";
import GestureSummary from "./GestureSummary";
import { calculateAge } from "@/lib/dateUtils";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useAdminRole } from "@/hooks/useAdminRole";
import EditMemorialDialog from "./EditMemorialDialog";

interface GestureTotals {
  ripCount: number;
  candleCount: number;
  flowerCount: number;
}

interface MemorialHeroProps {
  memorial: {
    id: string;
    slug: string;
    name: string;
    birthDate: string;
    deathDate: string;
    bio: string;
    photos: string[];
    author: {
      id: string;
      name: string;
      relation: string;
    };
    publishedAt: string;
    guestbookMessages: Array<{
      authorName: string;
      relationCategory: string;
    }>;
    funeralDate?: string | null;
    funeralLocation?: string | null;
    createdBy?: string;
     defaultPhotoIndex?: number;
    shareToken?: string | null;
  };
  onScrollToGuestbook: () => void;
  gestureTotals?: GestureTotals;
  userHasPosted?: boolean;
  onGestureClick?: (type: 'rip' | 'candle' | 'flower') => void;
  onMemorialUpdated?: () => void;
}

const MemorialHero = ({ memorial, onScrollToGuestbook, gestureTotals, userHasPosted, onGestureClick, onMemorialUpdated }: MemorialHeroProps) => {
  // Filter out empty photos first
  const validPhotos = memorial.photos.filter(photo => photo && photo.length > 0);
  
  // Clamp defaultPhotoIndex to valid range
  const safeDefaultIndex = (memorial.defaultPhotoIndex ?? 0) < validPhotos.length ? (memorial.defaultPhotoIndex ?? 0) : 0;
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(safeDefaultIndex);
  
  const { isFollowing: checkIsFollowing, toggleFollow } = useNotifications();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isProfileComplete, loading: profileLoading } = useProfile();
  const { isAdminOrMod, loading: roleLoading } = useAdminRole();

  const age = calculateAge(memorial.birthDate, memorial.deathDate);
  
  // Check if current user is the creator
  const isCreator = user?.id === memorial.createdBy;

  // Auto-advance photos every 5 seconds
  useEffect(() => {
    if (validPhotos.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentPhotoIndex((prev) => (prev + 1) % validPhotos.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [validPhotos.length]);

  return (
    <section className="container mx-auto px-4 pb-8">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Photo Gallery - Sequential with Snap Transitions */}
        <div className="relative">
          {validPhotos.length > 0 ? (
            <div className="memorial-photo-container aspect-[3/4] overflow-hidden relative">
              {validPhotos.map((photo, index) => (
                <div
                  key={`photo-${index}`}
                  className={`memorial-photo-slide absolute inset-0 ${
                    index === currentPhotoIndex ? 'active' : ''
                  }`}
                >
                  <ProgressiveImage
                    src={photo}
                    alt={`Portrait de ${memorial.name}`}
                    className="w-full h-full object-cover memorial-photo-grayscale"
                    priority={index === 0}
                  />
                </div>
              ))}
              
              {/* Photo Counter */}
              {validPhotos.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/80 px-3 py-1 rounded-full text-sm font-sans z-10">
                  {currentPhotoIndex + 1} / {validPhotos.length}
                </div>
              )}

              <style>{`
                .memorial-photo-slide {
                  opacity: 0;
                  transition: opacity 0.15s ease-out;
                  pointer-events: none;
                }

                .memorial-photo-slide.active {
                  opacity: 1;
                  pointer-events: auto;
                }

                .memorial-photo-grayscale {
                  filter: grayscale(100%);
                  transition: filter 0.6s ease-in-out;
                }

                .memorial-photo-slide.active:hover .memorial-photo-grayscale {
                  filter: grayscale(0%);
                }
              `}</style>
            </div>
          ) : (
            <div className="aspect-[3/4] bg-muted flex items-center justify-center">
              <span className="text-muted-foreground">Aucune photo</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center">
          <div className="animate-fade-in">
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl mb-2">
              {memorial.name}
              {age !== null && (
                <span className="text-muted-foreground font-normal text-3xl md:text-4xl ml-3">
                  • {age} ans
                </span>
              )}
            </h1>
            <p className="font-sans text-lg text-muted-foreground mb-1">
              {memorial.birthDate} — {memorial.deathDate}
            </p>
            
            {/* Publication Info */}
            <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground mb-1 font-sans">
              <span>Publié Par •</span>
              <Link 
                to={`/compte/${memorial.author.id}`} 
                className="text-foreground hover:underline"
              >
                {memorial.author.name}
              </Link>
            </div>

            <p className="font-serif text-lg leading-relaxed text-foreground/80 mb-8">
              {memorial.bio}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Bouton Rédiger un hommage */}
              {user && !profileLoading && !roleLoading && isProfileComplete && !isAdminOrMod && (
                <button
                  onClick={onScrollToGuestbook}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-sans text-sm font-medium transition-all duration-300 hover:bg-accent-green hover:text-accent-green-foreground"
                >
                  <Feather className="w-4 h-4" />
                  <span>Rédiger un hommage</span>
                </button>
              )}
              
              <button
                onClick={() => {
                  toggleFollow({
                    slug: memorial.slug,
                    name: memorial.name,
                    photoUrl: memorial.photos?.[0] || "",
                  });
                  toast({
                    title: checkIsFollowing(memorial.slug) ? "Mémorial retiré des suivis" : "Mémorial suivi",
                    description: checkIsFollowing(memorial.slug) 
                      ? "Vous ne recevrez plus de notifications" 
                      : "Vous recevrez des notifications pour ce mémorial",
                  });
                }}
                className={`btn-ghost ${checkIsFollowing(memorial.slug) ? "bg-muted" : ""}`}
              >
                {checkIsFollowing(memorial.slug) ? (
                  <>
                    <BellOff className="w-4 h-4" />
                    <span>Ne plus suivre</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    <span>Suivre</span>
                  </>
                )}
              </button>
              
              <ShareButtons
                url={memorial.shareToken 
                  ? `${window.location.origin}/m/${memorial.shareToken}` 
                  : `${window.location.origin}/memorial/${memorial.slug}`}
                title={`Hommage à ${memorial.name}`}
                description={memorial.bio}
                slug={memorial.slug}
                shareToken={memorial.shareToken}
              />
              
              {/* Edit button for creator */}
              {isCreator && onMemorialUpdated && (
                <EditMemorialDialog
                  memorialId={memorial.id}
                  initialData={{
                    bio: memorial.bio,
                    funeralDate: memorial.funeralDate,
                    funeralLocation: memorial.funeralLocation,
                     photos: memorial.photos,
                     defaultPhotoIndex: memorial.defaultPhotoIndex || 0,
                  }}
                  onSave={onMemorialUpdated}
                />
              )}
            </div>
            
            {/* Gesture Summary - Hommages reçus */}
            {gestureTotals && onGestureClick && (
              <div className="mt-6">
                <div className="h-px bg-admin-burgundy/25 mb-4" />
                <GestureSummary
                  totals={gestureTotals}
                  userHasPosted={userHasPosted || false}
                  onRIPClick={() => onGestureClick('rip')}
                  onCandleClick={() => onGestureClick('candle')}
                  onFlowerClick={() => onGestureClick('flower')}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MemorialHero;
