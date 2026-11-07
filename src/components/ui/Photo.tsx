import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl, getOptimizedSrcSet } from "@/lib/imageUrl";
import { adjustmentForImage } from "@/lib/photoCanon";
import { framingFor, type FramingAdjust } from "@/lib/photoFraming";
import { usePhotoFraming } from "@/hooks/usePhotoFraming";
import { portraitResolution, portraitTone } from "@/lib/portraitRendering";

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
  /** Banc d'essai : force un cadrage (null = brut). Absent = réglage publié. */
  framing?: FramingAdjust | null;
  detail?: boolean;
  colorMode?: "rest" | "color";
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
    framing,
    detail = false,
    colorMode,
  }: PhotoProps) => {
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    const [canon, setCanon] = useState<{ brightness: number; contrast: number } | null>(null);
    const deceased = tone === "memorial";
    const { data: framingSetting } = usePhotoFraming();
    // Cadrage biométrique : override explicite (banc d'essai) sinon réglage publié.
    const frame = deceased ? (framing !== undefined ? framing : framingFor(src, framingSetting)) : null;
    const filterId = `portrait-${useId().replace(/:/g, "")}`;
    const toneValues = portraitTone(frame);
    const useRetouchFilter = deceased && (toneValues.sharpness > 0 || toneValues.exponent !== 1 || toneValues.amplitude !== 1);
    const imgRef = useRef<HTMLImageElement>(null);
    const originalAttempted = useRef(false);

    useEffect(() => {
      setLoaded(false);
      setFailed(false);
      setCanon(null);
      originalAttempted.current = false;
      if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setLoaded(true);
    }, [src]);

    const resolution = deceased ? portraitResolution(targetWidth, targetHeight, frame, detail) : { width: targetWidth, height: targetHeight };
    const opts = { ...resolution, resize: "contain" as const };
    const optimizedSrc = src ? getOptimizedImageUrl(src, opts) : undefined;
    const optimizedSrcSet = src ? deceased && src.includes("/storage/v1/object/public/")
      ? `${optimizedSrc} 1x, ${getOptimizedImageUrl(src, { ...opts, width: Math.min(2000, opts.width * 2), height: opts.height ? Math.min(2000, opts.height * 2) : undefined })} 2x`
      : getOptimizedSrcSet(src, opts) : undefined;

    // Filet : si la transformation CDN échoue, retour au fichier original ; sinon repli.
    const handleError = useCallback(
      (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        if (src && !originalAttempted.current && optimizedSrc !== src) {
          originalAttempted.current = true;
          img.srcset = "";
          img.src = src;
        } else {
          setFailed(true);
        }
      },
      [src, optimizedSrc]
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
            {useRetouchFilter && <svg className="absolute w-0 h-0" aria-hidden="true" focusable="false">
              <defs><filter id={filterId} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                <feComponentTransfer>
                  <feFuncR type="gamma" amplitude={toneValues.amplitude} exponent={toneValues.exponent} offset={0} />
                  <feFuncG type="gamma" amplitude={toneValues.amplitude} exponent={toneValues.exponent} offset={0} />
                  <feFuncB type="gamma" amplitude={toneValues.amplitude} exponent={toneValues.exponent} offset={0} />
                </feComponentTransfer>
                <feConvolveMatrix order="3" kernelMatrix={`0 ${-toneValues.sharpness} 0 ${-toneValues.sharpness} ${1 + 4 * toneValues.sharpness} ${-toneValues.sharpness} 0 ${-toneValues.sharpness} 0`} divisor={1} preserveAlpha edgeMode="duplicate" />
              </filter></defs>
            </svg>}
            {!loaded && <div className="absolute inset-0 skeleton-shimmer" aria-hidden="true" />}
            <img
              ref={imgRef}
              src={optimizedSrc}
              srcSet={optimizedSrcSet}
              sizes={sizes}
              data-color-mode={deceased ? colorMode : undefined}
              alt={safeAlt}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={lcp ? "high" : "auto"}
              decoding="async"
              crossOrigin={deceased ? "anonymous" : undefined}
              onLoad={(e) => {
                setLoaded(true);
                if (deceased) setCanon(adjustmentForImage(e.currentTarget));
              }}
              onError={handleError}
              className={cn(
                "w-full h-full object-contain transition-opacity duration-700 motion-reduce:transition-none",
                loaded ? "opacity-100" : "opacity-0",
                tone === "memorial" && "photo-memorial",
                imgClassName
              )}
              style={{
                objectFit: "contain",
                ...(frame && frame.scale > 1 ? { transform: `scale(${frame.scale})`, transformOrigin: `${frame.x}% ${frame.y}%` } : {}),
                ...(canon || frame ? {
                  ["--canon-b" as string]: (frame?.autoLight === false ? 1 : canon?.brightness ?? 1) * (frame?.light ?? 1) * toneValues.exposure,
                  ["--canon-c" as string]: (frame?.autoLight === false ? 1 : canon?.contrast ?? 1) * (frame?.contrast ?? 1),
                  ["--portrait-warmth" as string]: frame?.warmth ?? 0.18,
                  ["--portrait-saturation" as string]: frame?.saturation ?? 1,
                  ["--portrait-retouch" as string]: useRetouchFilter ? `url(#${filterId})` : "brightness(1)",
                } : {}),
              }}
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
