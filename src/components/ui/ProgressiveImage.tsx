import { useState, useRef, useEffect, useCallback, memo } from "react";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl, getOptimizedSrcSet } from "@/lib/imageUrl";

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean;
  /** Largeur de rendu cible (CSS px) utilisée pour la transformation CDN. */
  targetWidth?: number;
  /** Hauteur de rendu cible (CSS px), optionnelle. */
  targetHeight?: number;
}

const ProgressiveImage = memo(({
  src,
  alt,
  className,
  priority = false,
  targetWidth = 800,
  targetHeight,
  ...props
}: ProgressiveImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const optimizedSrc = getOptimizedImageUrl(src, {
    width: targetWidth,
    height: targetHeight,
  });
  const optimizedSrcSet = getOptimizedSrcSet(src, {
    width: targetWidth,
    height: targetHeight,
  });

  useEffect(() => {
    setIsLoaded(false);
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src]);

  // Filet de sécurité : retour à l'original si la transformation échoue.
  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      if (src && img.src !== src) {
        img.srcset = "";
        img.src = src;
      } else {
        setIsLoaded(true);
      }
    },
    [src]
  );

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Shimmer skeleton placeholder */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          isLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <div className="w-full h-full bg-muted skeleton-shimmer" />
      </div>

      {/* Full resolution image */}
      <img
        ref={imgRef}
        src={optimizedSrc}
        srcSet={optimizedSrcSet}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
        className={cn(
          "transition-opacity duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  );
});

ProgressiveImage.displayName = "ProgressiveImage";

export default ProgressiveImage;
