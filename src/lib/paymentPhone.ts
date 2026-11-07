/** Validate an explicitly entered international Gabon mobile number; never add a prefix. */
export function paymentPhone(raw: string): string | null {
  const entered = raw.trim().replace(/\s+/g, "");
  return /^\+241[67]\d{7}$/.test(entered) ? entered : null;
}

export const PAYMENT_PHONE_ERROR = "Saisissez le numéro avec +241, sans le 0 initial (ex. +24177123456).";