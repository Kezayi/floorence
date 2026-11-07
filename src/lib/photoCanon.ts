/**
 * Canon photographique des défunts — étalons : Odile MBIGOU, David KOUNA,
 * Marc AYI, Paul BIYOGHE (768×1024, ratio 3:4, N&B au repos, couleur au survol).
 * Luminance moyenne mesurée 68,8–102,3 (moy. 82) ; écart-type 38–64 (moy. 48).
 *
 * Ajustement appliqué à l'affichage (donc rétroactif) : aucun fichier stocké
 * n'est réécrit ni recadré — préserve l'intégrité des sources.
 */
export const PHOTO_CANON = {
  ratio: 3 / 4,
  width: 768,
  height: 1024,
  meanLuminance: 82,
  contrastStd: 48,
} as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Luminance moyenne / écart-type d'un tampon RGBA (Rec. 709). */
export function measureLuminance(pixels: ArrayLike<number>) {
  let sum = 0, sq = 0, n = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const l = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    sum += l; sq += l * l; n++;
  }
  if (!n) return { mean: PHOTO_CANON.meanLuminance, std: PHOTO_CANON.contrastStd };
  const mean = sum / n;
  return { mean, std: Math.sqrt(Math.max(0, sq / n - mean * mean)) };
}

/** Facteurs CSS pour rapprocher une photo du canon, bornés pour rester naturels. */
export function canonAdjustment(mean: number, std: number) {
  const brightness = clamp(PHOTO_CANON.meanLuminance / Math.max(mean, 1), 0.7, 1.4);
  const contrast = clamp(PHOTO_CANON.contrastStd / Math.max(std, 1), 0.8, 1.3);
  return { brightness: +brightness.toFixed(3), contrast: +contrast.toFixed(3) };
}

/** Mesure une image chargée ; null si illisible (CORS, décodeur). */
export function adjustmentForImage(img: HTMLImageElement) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 48; canvas.height = 64;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 48, 64);
    const { mean, std } = measureLuminance(ctx.getImageData(0, 0, 48, 64).data);
    return canonAdjustment(mean, std);
  } catch {
    return null;
  }
}
