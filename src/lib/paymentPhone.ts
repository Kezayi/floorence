/** Accept 074…, 74…, +241 74…; return the national 9-digit form PVit expects (06…/07…). */
export function paymentPhone(raw: string): string | null {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00241")) d = d.slice(5);
  else if (d.startsWith("241") && d.length > 9) d = d.slice(3);
  if (d.length === 8) d = "0" + d;
  return /^0[67]\d{7}$/.test(d) ? d : null;
}

export const PAYMENT_PHONE_ERROR = "Numéro Airtel ou Moov invalide (ex. 074 12 34 56).";

/** Operator shown to the payer, derived from the same normalization as billing (06 = Moov, 07 = Airtel). */
export function paymentOperatorLabel(raw: string): "Airtel Money" | "Moov Money" | null {
  const p = paymentPhone(raw);
  if (!p) return null;
  return p.startsWith("07") ? "Airtel Money" : "Moov Money";
}
