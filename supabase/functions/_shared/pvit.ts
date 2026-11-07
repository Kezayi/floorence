// PVit v2 (myPVit, production) — sole payment gateway for Floorence.
// Docs: https://docs.mypvit.pro/fr/intro/getting-started
// Secrets: PVIT_SECRET_PASSWORD, PVIT_ACCOUNT_AIRTEL, PVIT_ACCOUNT_MOOV, PVIT_URL_CODE_SECRET,
//          PVIT_URL_CODE_REST, PVIT_CALLBACK_URL_CODE, PVIT_URL_CODE_STATUS (optional, status fallback).

export const PVIT_API = "https://api.mypvit.pro";
import { pvitIssue, paymentIssueText } from "./pvitErrors.ts";
// Official PVit webhook source IPs.
export const PVIT_WEBHOOK_IPS = ["176.31.65.18", "176.31.65.20", "176.31.65.21", "13.59.249.167"];

export type PvitOperator = "AIRTEL_MONEY" | "MOOV_MONEY";
type Env = (k: string) => string | undefined;
const e = (env: Env, k: string) => (env(k) ?? "").trim().replace(/^\/+|\/+$/g, "");

/** Local digits for operator detection only; never use this to rewrite a payment number. */
export function normalizeMsisdn(raw: string): string | null {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00241")) d = d.slice(5);
  else if (d.startsWith("241") && d.length > 9) d = d.slice(3);
  if (d.length === 8) d = "0" + d;
  return /^0\d{8}$/.test(d) ? d : null;
}

/** PVit rejects +241 (error 3024): send the national 9-digit form 06…/07…, any input form accepted. */
export function enteredPaymentMsisdn(raw: string): string | null {
  const n = normalizeMsisdn(raw);
  return n && /^0[67]\d{7}$/.test(n) ? n : null;
}

/** Gabon prefixes: 07/74/76/77 = Airtel, 06/62/65/66 = Moov. */
export function detectOperator(msisdn: string): PvitOperator | null {
  const normalized = normalizeMsisdn(msisdn);
  if (normalized?.startsWith("07")) return "AIRTEL_MONEY";
  if (normalized?.startsWith("06")) return "MOOV_MONEY";
  return null;
}

export function resolvePvitConfig(env: Env) {
  const cfg = {
    password: (env("PVIT_SECRET_PASSWORD") ?? "").trim(),
    accounts: { AIRTEL_MONEY: e(env, "PVIT_ACCOUNT_AIRTEL"), MOOV_MONEY: e(env, "PVIT_ACCOUNT_MOOV") } as Record<PvitOperator, string>,
    secretCode: e(env, "PVIT_URL_CODE_SECRET"),
    restCode: e(env, "PVIT_URL_CODE_REST"),
    callbackCode: e(env, "PVIT_CALLBACK_URL_CODE"),
    statusCode: e(env, "PVIT_URL_CODE_STATUS"),
  };
  const missing = Object.entries({
    PVIT_SECRET_PASSWORD: cfg.password, PVIT_ACCOUNT_AIRTEL: cfg.accounts.AIRTEL_MONEY, PVIT_ACCOUNT_MOOV: cfg.accounts.MOOV_MONEY,
    PVIT_URL_CODE_SECRET: cfg.secretCode, PVIT_URL_CODE_REST: cfg.restCode, PVIT_CALLBACK_URL_CODE: cfg.callbackCode,
  }).filter(([, v]) => !v).map(([k]) => k);
  return { ...cfg, ok: missing.length === 0, missing };
}
export type PvitConfig = ReturnType<typeof resolvePvitConfig>;
export const getPvitConfig = () => resolvePvitConfig((k) => Deno.env.get(k));

// X-Secret lives 3600 s. Cached per isolate and per account; renewed 10 min before expiry
// or immediately after a 401/403 (another isolate may have rotated it).
const cache = new Map<string, { secret: string; exp: number }>();

export async function getSecret(cfg: PvitConfig, account: string, force = false): Promise<string> {
  const hit = cache.get(account);
  if (!force && hit && hit.exp - Date.now() > 10 * 60_000) return hit.secret;
  const res = await fetch(`${PVIT_API}/v2/${cfg.secretCode}/renew-secret`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ operationAccountCode: account, password: cfg.password }),
  });
  const data = await res.json().catch(() => null) as { secret?: string; expires_in?: number } | null;
  if (!res.ok || !data?.secret) throw new Error(paymentIssueText(pvitIssue(data, res.status)));
  cache.set(account, { secret: data.secret, exp: Date.now() + (Number(data.expires_in) || 3600) * 1000 });
  return data.secret;
}

async function withSecret(cfg: PvitConfig, account: string, call: (s: string) => Promise<Response>) {
  let r = await call(await getSecret(cfg, account));
  if (r.status === 401 || r.status === 403) r = await call(await getSecret(cfg, account, true));
  return r;
}

/** PVit rejects `product` longer than 15 chars (CONSTRAINT_VIOLATION 8000). */
export const PVIT_PRODUCT_MAX = 15;
export function pvitProductLabel(kind: "memorial" | "cierge" | "fleur" | "mixte", candles = 0, flowers = 0): string {
  const label = kind === "memorial" ? "Memorial"
    : kind === "mixte" ? `Cierge${candles} Fleur${flowers}`
    : kind === "cierge" ? `Cierge x${candles}` : `Fleur x${flowers}`;
  return label.length <= PVIT_PRODUCT_MAX ? label : (kind === "mixte" ? `C${candles} F${flowers}` : label).slice(0, PVIT_PRODUCT_MAX);
}

/** Short alphanumeric merchant reference (PVit-friendly). */
export const newReference = () =>
  `FLR${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export async function initiatePayment(cfg: PvitConfig, p: {
  amount: number; reference: string; msisdn: string; operator: PvitOperator; product: string;
}) {
  const msisdn = enteredPaymentMsisdn(p.msisdn);
  if (!msisdn || detectOperator(msisdn) !== p.operator) {
    throw new Error("Numéro Mobile Money invalide ou opérateur incompatible");
  }
  const account = cfg.accounts[p.operator];
  const body = JSON.stringify({
    agent: "FLOORENCE",
    amount: p.amount,
    reference: p.reference,
    service: "RESTFUL",
    callback_url_code: cfg.callbackCode,
    customer_account_number: msisdn,
    merchant_operation_account_code: account,
    transaction_type: "PAYMENT",
    owner_charge: "CUSTOMER",
    owner_charge_operator: "CUSTOMER",
    operator_code: p.operator,
    product: p.product.slice(0, PVIT_PRODUCT_MAX),
    free_info: "Floorence",
  });
  const res = await withSecret(cfg, account, (s) => fetch(`${PVIT_API}/v2/${cfg.restCode}/rest`, {
    method: "POST",
    headers: { "X-Secret": s, "X-Callback-MediaType": "application/json", "Content-Type": "application/json", Accept: "application/json" },
    body,
  }));
  const raw = await res.text();
  let data: any = null; try { data = JSON.parse(raw); } catch { /* non-JSON */ }
  const st = String(data?.status ?? "").toUpperCase();
  const accepted = res.ok && !!data?.reference_id && (st === "PENDING" || st === "SUCCESS");
  return { accepted, httpStatus: res.status, transactionId: data?.reference_id as string | undefined, data, raw: raw.slice(0, 800), account };
}

export type PvitFinal = "success" | "failed" | "pending";
export function mapPvitStatus(s: unknown): PvitFinal {
  const v = String(s ?? "").toUpperCase();
  if (v === "SUCCESS" || v === "SUCCESSFUL") return "success";
  if (v === "FAILED" || v === "FAILURE" || v === "CANCELLED" || v === "EXPIRED" || v === "REJECTED") return "failed";
  return "pending";
}

/** GET status (requires PVIT_URL_CODE_STATUS). Returns null if not configured or unreachable. */
export async function checkPvitStatus(cfg: PvitConfig, transactionId: string, account: string) {
  if (!cfg.statusCode || !transactionId || !account) return null;
  const qs = new URLSearchParams({ transactionId, accountOperationCode: account, transactionOperation: "PAYMENT" });
  try {
    const res = await withSecret(cfg, account, (s) => fetch(`${PVIT_API}/${cfg.statusCode}/status?${qs}`, {
      headers: { "X-Secret": s, Accept: "application/json" },
    }));
    const raw = await res.text();
    let data: any = null; try { data = JSON.parse(raw); } catch { /* */ }
    if (!res.ok || !data) return { state: "pending" as PvitFinal, raw: raw.slice(0, 500), amount: null };
    return { state: mapPvitStatus(data.status), raw: raw.slice(0, 500), amount: Number(data.amount ?? NaN) };
  } catch (err) {
    console.error("[pvit:status] error", (err as Error).message);
    return null;
  }
}
