import type { FramingAdjust } from "./photoFraming";

/** Account for face enlargement before requesting CDN pixels, not after. */
export function portraitResolution(width: number, height: number | undefined, frame: FramingAdjust | null, detail: boolean) {
  const scale = frame?.scale ?? 1;
  return {
    width: Math.min(2000, Math.ceil(width * scale)),
    height: height ? Math.min(2000, Math.ceil(height * scale)) : undefined,
    quality: detail ? 95 : 85,
  };
}

export function portraitTone(frame: FramingAdjust | null) {
  return {
    exposure: Math.pow(2, frame?.exposure ?? 0),
    exponent: 1 - (frame?.shadows ?? 0),
    amplitude: 1 + (frame?.highlights ?? 0),
    sharpness: frame?.sharpness ?? 0,
  };
}