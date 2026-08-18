import { useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { Flame, Flower2 } from "lucide-react";
import { CrossIcon } from "./MemorialIcons";
import { calculateAge } from "@/lib/dateUtils";
import { useMemorialPrefetch } from "@/hooks/useMemorialPrefetch";
import DemoBadge from "./DemoBadge";
import { getOptimizedImageUrl, getOptimizedSrcSet } from "@/lib/imageUrl";

interface MemorialCardProps {
  id: string;
  slug: string;
  shareToken?: string | null;
  name: string;
  birthDate: string;
  deathDate: string;
  photoUrl?: string;
  ripCount: number;
  candleCount: number;
  flowerCount: number;
  type: "RECENT" | "PAST";
  variant?: "card" | "list";
  priority?: boolean;
  isDemo?: boolean;
}

const MemorialCard = ({
  id,
  slug,
  shareToken,
  name,
  birthDate,
  deathDate,
  photoUrl,
  ripCount,
  candleCount,
  flowerCount,
  type,
  variant = "card",
  priority = false,
  isDemo = false,
}: MemorialCardProps) => {
  const { prefetchMemorial } = useMemorialPrefetch();
  const handlePrefetch = useCallback(() => prefetchMemorial(id), [id, prefetchMemorial]);
  const age = calculateAge(birthDate, deathDate);
  // Filet de sécurité : si la CDN de transformation échoue, on retombe sur l'original.
  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      if (photoUrl && img.src !== photoUrl) {
        img.srcset = "";
        img.src = photoUrl;
      }
    },
    [photoUrl]
  );
  // Prefer obfuscated token URL, fallback to slug
  const memorialUrl = shareToken ? `/m/${shareToken}` : `/memorial/${slug}`;
  if (variant === "list") {
    return (
      <Link
        to={memorialUrl}
        className="memorial-card group flex flex-row items-stretch bg-card hover:shadow-lg hover:shadow-black/5 transition-all duration-500"
        onMouseEnter={handlePrefetch}
        onTouchStart={handlePrefetch}
      >
        {/* Photo Portrait - Left */}
        <div className="w-24 md:w-32 lg:w-40 flex-shrink-0 relative overflow-hidden bg-muted aspect-[3/4]">
          {photoUrl ? (
            <img
              src={getOptimizedImageUrl(photoUrl, { width: 160, height: 213 })}
              srcSet={getOptimizedSrcSet(photoUrl, { width: 160, height: 213 })}
              sizes="(max-width: 768px) 96px, 160px"
              alt={`Portrait de ${name}`}
              width={160}
              height={213}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
              onError={handleImageError}
              className="w-full h-full object-cover portrait-memorial"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <span className="font-serif text-3xl text-muted-foreground/30">
                {name.charAt(0)}
              </span>
            </div>
          )}
          {type === "RECENT" && (
            <div className="absolute top-2 left-2">
              <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-xs font-sans">
                Récent
              </span>
            </div>
          )}
          {isDemo && (
            <div className="absolute top-2 right-2">
              <DemoBadge size="sm" />
            </div>
          )}
        </div>

        <div className="flex-1 p-4 md:p-6 flex flex-col justify-center">
          <h3 className="font-serif text-lg md:text-xl lg:text-2xl leading-tight mb-1 group-hover:text-foreground/80 transition-colors">
            {name}
            {age !== null && (
              <span className="text-muted-foreground font-normal text-base md:text-lg ml-2">
                • {age} ans
              </span>
            )}
          </h3>
          <p className="font-sans text-sm text-muted-foreground mb-3">
            {birthDate} — {deathDate}
          </p>
          
          {/* Stats - Gestures with icons and colored labels */}
          <div className="flex items-center gap-4 md:gap-6 text-sm">
            <span className="flex items-center gap-1 text-foreground font-medium">
              <CrossIcon size={14} />
              {ripCount} <span className="font-normal">RIP</span>
            </span>
            <span className={`flex items-center gap-1 text-gesture-candle font-medium ${candleCount > 5 ? 'fervor-glow-candle rounded-sm px-1' : ''}`}>
              <Flame size={14} />
              {candleCount} <span className="font-normal">Cierges</span>
            </span>
            <span className={`flex items-center gap-1 text-gesture-flower font-medium ${flowerCount > 5 ? 'fervor-glow-flower rounded-sm px-1' : ''}`}>
              <Flower2 size={14} />
              {flowerCount} <span className="font-normal">Fleurs</span>
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Default card variant
  return (
    <Link
      to={memorialUrl}
      className="memorial-card group block"
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
    >
      {/* Photo Portrait */}
      <div className="aspect-[3/4] relative overflow-hidden bg-muted">
        {photoUrl ? (
          <img
            src={getOptimizedImageUrl(photoUrl, { width: 400, height: 533 })}
            srcSet={getOptimizedSrcSet(photoUrl, { width: 400, height: 533 })}
            sizes="(max-width: 768px) 50vw, 400px"
            alt={`Portrait de ${name}`}
            width={400}
            height={533}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            onError={handleImageError}
            className="w-full h-full object-cover portrait-memorial"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <span className="font-serif text-6xl text-muted-foreground/30">
              {name.charAt(0)}
            </span>
          </div>
        )}

        {/* Type Badge */}
        {type === "RECENT" && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-sans">
              Récent
            </span>
          </div>
        )}
        {isDemo && (
          <div className="absolute top-3 right-3 z-10">
            <DemoBadge size="sm" />
          </div>
        )}

        {/* Overlay Info on Hover */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-memorial-dark-foreground font-medium">
              <CrossIcon size={14} />
              {ripCount} <span className="font-normal opacity-80">RIP</span>
            </span>
            <span className="flex items-center gap-1 text-gesture-candle font-medium">
              <Flame size={14} />
              {candleCount} <span className="font-normal opacity-80">Cierges</span>
            </span>
            <span className="flex items-center gap-1 text-gesture-flower font-medium">
              <Flower2 size={14} />
              {flowerCount} <span className="font-normal opacity-80">Fleurs</span>
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-serif text-lg md:text-xl leading-tight mb-1 group-hover:text-foreground/80 transition-colors">
          {name}
          {age !== null && (
            <span className="text-muted-foreground font-normal text-sm ml-1">
              • {age} ans
            </span>
          )}
        </h3>
        <p className="font-sans text-sm text-muted-foreground">
          {birthDate} — {deathDate}
        </p>
      </div>
    </Link>
  );
};

export default memo(MemorialCard);
