import { memo, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl, getOptimizedSrcSet } from "@/lib/imageUrl";

/**
 * <Photo> — composant souverain (Norme AAA, Piliers 1 & 3).
 *
 * Point de vérité unique pour l'affichage photographique :
 * - ratio original préservé (object-contain, jamais de recadrage destructif) ;
 * - fond neutre « scene ink » (#0D0D0D) autour de l'image ;
 * - demande au CDN un redimensionnement `contain` : le fichier stocké n'est
 *   jamais recadré ni écrasé ;
 * - chargement progressif (shimmer → fondu) ;
 * - texte alternatif obligatoire ;
 * - repli digne (initiales ou symbole neutre) si la photo est absente.
 */

export type PhotoVariant = "archive" | "portrait" | "card" | "node";
export type PhotoTone = "memorial" | "none";

export interface PhotoProps {
  src?: string | null;
  /** Obligatoire et non vide (WCAG AA). */
  alt: string;
  variant?: PhotoVariant;
  /** memorial = N&B par défaut, couleur au survol du groupe. */
  tone?: PhotoTone;
  /** Nom servant au repli par initiales. Sans nom : symbole neutre. */
  fallbackName?: string;
  /** Largeur cible (CSS px) pour la transformation CDN. */
  targetWidth?: number;
  targetHeight?: number;
  priority?: boolean;
  lcp?: boolean;
  className?: string;
  imgClassName?: string;
  sizes?: string;
}

const VARIANT_CONTAINER: Record<PhotoVariant, string> = {
  archive: "",
  portrait: "",
  card: "",
  node: "rounded-full",
};

const FALLBACK_TEXT: Record<PhotoVariant, string> = {
  archive: "text-6xl",
  portrait: "text-7xl",
  card: "text-6xl",
  node: "text-lg",
};

const initialsOf = (name?: string) =>
  (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const Photo = memo(
  ({
    src,
    alt,
    variant = "card",
    tone = "none",
    fallbackName,
    targetWidth = 400,
    targetHeight,
    priority = false,
    lcp = false,
    className,
    imgClassName,
    sizes,
  }: PhotoProps) => {
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
      setLoaded(false);
      setFailed(false);
      if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setLoaded(true);
    }, [src]);

    const opts = { width: targetWidth, height: targetHeight, resize: "contain" as const };
    const optimizedSrc = src ? getOptimizedImageUrl(src, opts) : undefined;
    const optimizedSrcSet = src ? getOptimizedSrcSet(src, opts) : undefined;

    // Filet : si la transformation CDN échoue, retour au fichier original ; sinon repli.
    const handleError = useCallback(
      (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (src && img.src !== src) {
          img.srcset = "";
          img.src = src;
        } else {
          setFailed(true);
        }
      },
      [src]
    );

    const safeAlt = alt.trim() || (fallbackName ? `Portrait de ${fallbackName}` : "Photographie");
    const showImage = !!src && !failed;
    const initials = initialsOf(fallbackName);

    return (
      <div
        className={cn(
          "relative w-full h-full overflow-hidden bg-scene-ink",
          VARIANT_CONTAINER[variant],
          className
        )}
      >
        {showImage ? (
          <>
            {!loaded && <div className="absolute inset-0 skeleton-shimmer" aria-hidden="true" />}
            <img
              ref={imgRef}
              src={optimizedSrc}
              srcSet={optimizedSrcSet}
              sizes={sizes}
              alt={safeAlt}
              loading={priority ? "eager" : "lazy"}
              {...(lcp ? { fetchpriority: "high" } : {})}
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={handleError}
              className={cn(
                "w-full h-full object-contain transition-opacity duration-700",
                loaded ? "opacity-100" : "opacity-0",
                tone === "memorial" && "photo-memorial",
                imgClassName
              )}
            />
          </>
        ) : (
          <div
            role="img"
            aria-label={safeAlt}
            className="w-full h-full flex items-center justify-center"
          >
            <span
              className={cn(
                "font-serif text-scene-ink-foreground/50 select-none",
                FALLBACK_TEXT[variant]
              )}
            >
              {initials || "✦"}
            </span>
          </div>
        )}
      </div>
    );
  }
);

Photo.displayName = "Photo";

export default Photo;
