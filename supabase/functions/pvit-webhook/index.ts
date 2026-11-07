// PVit v2 webhook: final status of a PAYMENT. Public URL registered in myPVit (callback code).
// Must answer HTTP 200 with a dynamic echo { transactionId, responseCode } of the received payload.
import { createClient } from "npm:@supabase/supabase-js@2";
import { finalizePaymentSuccess, markPaymentFailed } from "../_shared/paymentSuccess.ts";
import { PVIT_WEBHOOK_IPS, mapPvitStatus, getPvitConfig } from "../_shared/pvit.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  return (xff.split(",")[0] || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "").trim();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = clientIp(req);
  if (!PVIT_WEBHOOK_IPS.includes(ip)) {
    console.warn("[pvit-webhook] rejected source ip", ip);
    return json({ error: "Forbidden" }, 403);
  }

  const p = await req.json().catch(() => null) as Record<string, any> | null;
  if (!p?.transactionId) return json({ error: "Invalid payload" }, 400);
  const ack = { transactionId: p.transactionId, responseCode: p.code };

  try {
    if (p.transactionOperation && String(p.transactionOperation).toUpperCase() !== "PAYMENT") return json(ack);

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } });

    const ref = String(p.merchantReferenceId ?? "");
    const { data: tx } = await admin.from("payment_transactions")
      .select("id, amount, status, metadata, ebilling_transaction_id")
      .eq("ebilling_reference", ref).maybeSingle();
    if (!tx) {
      console.warn("[pvit-webhook] unknown reference", ref);
      return json(ack);
    }
    const meta = (tx.metadata ?? {}) as Record<string, any>;
    const storedId = meta.pvit_transaction_id || tx.ebilling_transaction_id;
    if (storedId && storedId !== p.transactionId) {
      console.warn("[pvit-webhook] transaction id mismatch", ref);
      return json(ack);
    }
    const cfg = getPvitConfig();
    const knownAccounts = Object.values(cfg.accounts);
    if (p.accountOperationCode && !knownAccounts.includes(String(p.accountOperationCode))) {
      console.warn("[pvit-webhook] foreign operation account", ref);
      return json(ack);
    }

    await admin.from("payment_transactions")
      .update({ last_api_response: JSON.stringify(p).slice(0, 1000), last_sync_at: new Date().toISOString() })
      .eq("id", tx.id);

    const state = mapPvitStatus(p.status);
    if (state === "success") {
      if (!(Number(p.amount) >= tx.amount)) {
        console.warn("[pvit-webhook] amount mismatch", ref);
        return json(ack);
      }
      await finalizePaymentSuccess(admin, { txId: tx.id, reference: ref, channel: "pvit-webhook", ebillingTransactionId: p.transactionId });
      console.log("[pvit-webhook] confirmed", ref);
    } else if (state === "failed") {
      await markPaymentFailed(admin, tx.id);
      console.log("[pvit-webhook] failed", ref);
    }
    return json(ack);
  } catch (err) {
    console.error("[pvit-webhook] error", (err as Error).message);
    return json(ack);
  }
});
