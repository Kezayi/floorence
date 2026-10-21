// GEST-01: server rules for memorial gestures (candles/flowers). Always paid, quota per tribute.
export const GESTURE_QUOTA_KEY = "gesture_max_per_tribute";
export const GESTURE_QUOTA_DEFAULT = 1;
export const GESTURE_QUOTA_MIN = 1;
export const GESTURE_QUOTA_MAX = 10;
export const GESTURE_PRICE_MIN = 500;
export const GESTURE_PRICE_MAX = 1_000_000;

export type Check<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateGesturePrice(value: unknown): Check<{ amount: number; currency: "XAF" }> {
  const amount = (value as { amount?: unknown } | null)?.amount;
  const currency = (value as { currency?: unknown } | null)?.currency ?? "XAF";
  if (currency !== "XAF") return { ok: false, error: "Devise invalide : XAF uniquement" };
  if (typeof amount !== "number" || !Number.isInteger(amount)) return { ok: false, error: "Prix entier requis" };
  if (amount < GESTURE_PRICE_MIN || amount > GESTURE_PRICE_MAX) {
    return { ok: false, error: `Prix du geste entre ${GESTURE_PRICE_MIN} et ${GESTURE_PRICE_MAX} XAF` };
  }
  return { ok: true, value: { amount, currency: "XAF" } };
}

export function validateGestureQuota(value: unknown): Check<{ max: number }> {
  const max = (value as { max?: unknown } | null)?.max;
  if (typeof max !== "number" || !Number.isInteger(max) || max < GESTURE_QUOTA_MIN || max > GESTURE_QUOTA_MAX) {
    return { ok: false, error: `Limite entière entre ${GESTURE_QUOTA_MIN} et ${GESTURE_QUOTA_MAX}` };
  }
  return { ok: true, value: { max } };
}

/** Active quota; a missing or corrupt setting falls back to the strict initial rule (1). */
export function readQuota(value: unknown): number {
  const v = validateGestureQuota(value);
  return v.ok ? v.value.max : GESTURE_QUOTA_DEFAULT;
}

/** Gestures declared when a tribute is created: one type only, total within quota. */
export function checkTributeGestures(candles: number, flowers: number, max: number): Check<null> {
  if (candles > 0 && flowers > 0) return { ok: false, error: "Un seul type de geste par hommage" };
  if (candles + flowers > max) return { ok: false, error: `Maximum ${max} geste(s) par hommage` };
  return { ok: true, value: null };
}

/** New order on a tribute: already delivered + in-flight orders + requested must stay within quota. */
export function checkGestureOrder(delivered: number, inFlight: number, requested: number, max: number): Check<null> {
  if (!Number.isInteger(requested) || requested < 1) return { ok: false, error: "Quantité invalide" };
  if (delivered + inFlight + requested > max) return { ok: false, error: `Maximum ${max} geste(s) par hommage atteint` };
  return { ok: true, value: null };
}
