import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Bell, BellOff, Feather } from "lucide-react";
import { getRelationWithDeceased } from "@/lib/relationshipInference";
import ShareButtons from "./ShareButtons";
import GestureSummary from "./GestureSummary";
import { calculateAge } from "@/lib/dateUtils";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useAdminRole } from "@/hooks/useAdminRole";
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
    isDemo?: boolean;
  };
  onScrollToGuestbook: () => void;
  gestureTotals?: GestureTotals;
  userHasPosted?: boolean;
  onGestureClick?: (type: 'rip' | 'candle' | 'flower') => void;
}

const MemorialHero = ({ memorial, onScrollToGuestbook, gestureTotals, userHasPosted, onGestureClick }: MemorialHeroProps) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  const { isFollowing: checkIsFollowing, toggleFollow } = useNotifications();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isProfileComplete, loading: profileLoading } = useProfile();
  const { isAdminOrMod, loading: roleLoading } = useAdminRole();

  const age = calculateAge(memorial.birthDate, memorial.deathDate);

  return (
    <section className="container mx-auto px-4 pb-8">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Photo Gallery */}
        <div className="relative">
          <div className="aspect-[3/4] overflow-hidden relative group">
            <img
              src={memorial.photos[currentPhotoIndex]}
              alt={`Portrait de ${memorial.name}`}
              className="w-full h-full object-cover portrait-memorial transition-opacity duration-300"
            />
            
            {/* Navigation Arrows */}
            {memorial.photos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPhotoIndex((prev) => 
                    prev === 0 ? memorial.photos.length - 1 : prev - 1
                  )}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10 rounded-full"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPhotoIndex((prev) => 
                    prev === memorial.photos.length - 1 ? 0 : prev + 1
                  )}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity h-10 w-10 rounded-full"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
                
                {/* Photo Counter */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/80 px-3 py-1 rounded-full text-sm font-sans">
                  {currentPhotoIndex + 1} / {memorial.photos.length}
                </div>
              </>
            )}
          </div>
          
          {/* Thumbnails */}
          {memorial.photos.length > 1 && (
            <div className="flex gap-2 mt-2">
              {memorial.photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPhotoIndex(index)}
                  className={`w-16 h-20 overflow-hidden transition-all ${
                    index === currentPhotoIndex 
                      ? "ring-2 ring-primary opacity-100" 
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={photo}
                    alt=""
                    className="w-full h-full object-cover portrait-memorial"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center">
          <div className="animate-fade-in">
            {/* Demo Badge */}
            {memorial.isDemo && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-600 dark:text-amber-400 text-xs font-sans uppercase tracking-wider">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Démonstration
              </div>
            )}
            
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-1 font-sans">
              <span>Publié {memorial.publishedAt}</span>
              <span className="hidden sm:inline">•</span>
              <span>
                Par{" "}
                <Link 
                  to={`/compte/${memorial.author.id}`} 
                  className="text-foreground hover:underline"
                >
                  {memorial.author.name}
                </Link>
                {" "}({getRelationWithDeceased(memorial.author.relation)})
              </span>
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
                    photoUrl: memorial.photos[0],
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
                url={`${window.location.origin}/memorial/${memorial.slug}`}
                title={`Hommage à ${memorial.name}`}
                description={memorial.bio}
              />
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
