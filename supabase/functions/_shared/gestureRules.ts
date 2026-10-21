// GESTURES-UNLIMITED: candles/flowers are always paid and have NO business quantity limit.
// The only bound is technical: one payment cannot exceed what the mobile-money operator accepts.
export const GESTURE_PRICE_MIN = 500;
export const GESTURE_PRICE_MAX = 1_000_000;
/** Mobile-money ceiling for a single payment (Airtel/Moov). Not a business quota. */
export const GESTURE_ORDER_MAX_XAF = 1_000_000;

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

const isCount = (n: number) => Number.isInteger(n) && n >= 0;

/** Gestures declared when a tribute is created: one type per payment, any quantity. */
export function checkTributeGestures(candles: number, flowers: number): Check<null> {
  if (!isCount(candles) || !isCount(flowers)) return { ok: false, error: "Quantité invalide" };
  if (candles > 0 && flowers > 0) return { ok: false, error: "Un type de geste par paiement : ajoutez l'autre ensuite" };
  return { ok: true, value: null };
}

/** One payment order: positive integer quantity, total within the operator ceiling. */
export function checkGestureOrder(quantity: number, unitPrice: number): Check<null> {
  if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, error: "Quantité invalide" };
  if (quantity * unitPrice > GESTURE_ORDER_MAX_XAF) {
    return { ok: false, error: `Montant maximal par paiement : ${GESTURE_ORDER_MAX_XAF.toLocaleString("fr-FR")} XAF. Répartissez en plusieurs paiements.` };
  }
  return { ok: true, value: null };
}
