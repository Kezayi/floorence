/**
 * Optimisation des images servies par le Storage (Norme AAA — Pilier 2).
 *
 * Réécrit une URL publique `/storage/v1/object/public/...` vers l'endpoint de
 * transformation `/storage/v1/render/image/public/...` afin de servir une image
 * redimensionnée et recompressée (WebP négocié automatiquement via `Accept`)
 * plutôt que le fichier brut HD.
 *
 * Toute URL non reconnue (asset local, CDN externe, data URI) est renvoyée
 * telle quelle : aucun risque de casse.
 */

const OBJECT_PUBLIC = "/storage/v1/object/public/";
const RENDER_PUBLIC = "/storage/v1/render/image/public/";

export interface OptimizedImageOptions {
  /** Largeur cible en CSS px (la CDN gère le DPR via srcSet). */
  width: number;
  /** Hauteur cible optionnelle. */
  height?: number;
  /** Qualité de compression 20–100. Défaut 80. */
  quality?: number;
  /** Mode de redimensionnement. Défaut `cover`. */
  resize?: "cover" | "contain" | "fill";
}

export const getOptimizedImageUrl = (
  url: string | undefined | null,
  { width, height, quality = 80, resize = "cover" }: OptimizedImageOptions
): string | undefined => {
  if (!url) return undefined;
  if (!url.includes(OBJECT_PUBLIC)) return url;

  const [base, existingQuery] = url.split("?");
  // Une URL déjà transformée ne doit pas être réécrite deux fois.
  if (existingQuery?.includes("width=")) return url;

  const params = new URLSearchParams();
  params.set("width", String(Math.round(width)));
  if (height) params.set("height", String(Math.round(height)));
  params.set("quality", String(quality));
  params.set("resize", resize);

  return `${base.replace(OBJECT_PUBLIC, RENDER_PUBLIC)}?${params.toString()}`;
};

/**
 * srcSet 1x/2x pour les écrans haute densité (mobile Gabon inclus).
 */
export const getOptimizedSrcSet = (
  url: string | undefined | null,
  options: OptimizedImageOptions
): string | undefined => {
  if (!url || !url.includes(OBJECT_PUBLIC)) return undefined;
  const x1 = getOptimizedImageUrl(url, options);
  const x2 = getOptimizedImageUrl(url, {
    ...options,
    width: options.width * 2,
    height: options.height ? options.height * 2 : undefined,
  });
  if (!x1 || !x2) return undefined;
  return `${x1} 1x, ${x2} 2x`;
};
