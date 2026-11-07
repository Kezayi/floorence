import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { finalizePaymentSuccess, markPaymentFailed } from "../_shared/paymentSuccess.ts";
import { getPvitConfig, checkPvitStatus } from "../_shared/pvit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Payment Reconciliation Worker
 * Checks pending/timeout transactions against the PVit status API (no debit).
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const deny = (msg: string, status: number) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // FIN-OPS-02: internal-only. Accepts the vault-held cron token (x-cron-token) or the service-role key.
  // Body is never used for authorization; rejected before any read.
  const cronToken = (req.headers.get("x-cron-token") ?? "").trim();
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  let authorized = false;
  if (bearer && srk && bearer.length === srk.length) {
    let d = 0; for (let i = 0; i < srk.length; i++) d |= bearer.charCodeAt(i) ^ srk.charCodeAt(i);
    authorized = d === 0;
  }
  if (!authorized && cronToken) {
    const { data: ok } = await supabaseAdmin.rpc("verify_reconciliation_token", { p_token: cronToken });
    authorized = ok === true;
  }
  if (!authorized) return cronToken || bearer ? deny("Accès refusé", 403) : deny("Non autorisé", 401);

  try {
    const { data: pending, error: fetchErr } = await supabaseAdmin
      .from("v_pending_reconciliation")
      .select("*");

    if (fetchErr) {
      console.error("[reconciliation] Fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!pending || pending.length === 0) {
      console.log("[reconciliation] No pending transactions to reconcile");
      return new Response(JSON.stringify({ reconciled: 0, message: "Aucune transaction à réconcilier" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[reconciliation] Found ${pending.length} transactions to check`);

    const pvit = getPvitConfig();
    let reconciledCount = 0;
    const results: { ref: string; result: string }[] = [];

    for (const tx of pending) {
      const ref = tx.ebilling_reference;

      const { data: fullTx } = await supabaseAdmin
        .from("payment_transactions")
        .select("id, amount, ebilling_transaction_id, metadata")
        .eq("ebilling_reference", ref)
        .maybeSingle();
      const meta = (fullTx?.metadata ?? {}) as Record<string, any>;
      const pvitId = meta.pvit_transaction_id || fullTx?.ebilling_transaction_id || null;
      if (!fullTx || !pvitId) { results.push({ ref, result: "no_operator_id" }); continue; }

      const st = await checkPvitStatus(pvit, pvitId, meta.pvit_account);
      if (!st) { results.push({ ref, result: "status_unavailable" }); continue; }
      await supabaseAdmin.from("payment_transactions")
        .update({ last_api_response: st.raw, last_sync_at: new Date().toISOString() }).eq("id", fullTx.id);

      if (st.state === "success" && (st.amount === null || Number.isNaN(st.amount) || st.amount >= fullTx.amount)) {
        const result = await finalizePaymentSuccess(supabaseAdmin, { txId: fullTx.id, reference: ref, channel: "reconciliation", ebillingTransactionId: pvitId });
        if (!result.claimed) { results.push({ ref, result: "already_processed" }); continue; }
        await supabaseAdmin.from("system_logs").insert({
          event_type: "PAYMENT_RECONCILED",
          details: { reference: ref, pvit_transaction_id: pvitId, amount: tx.amount, deceased: tx.deceased_name_snapshot, original_status: tx.status, gateway: "pvit" },
        });
        reconciledCount++;
        results.push({ ref, result: "reconciled" });
      } else if (st.state === "failed") {
        await markPaymentFailed(supabaseAdmin, fullTx.id);
        results.push({ ref, result: "failed" });
      } else {
        results.push({ ref, result: "still_pending" });
      }
    }

    console.log(`[reconciliation] Done: ${reconciledCount}/${pending.length} reconciled`);

    return new Response(
      JSON.stringify({
        checked: pending.length,
        reconciled: reconciledCount,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[reconciliation] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur interne" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
