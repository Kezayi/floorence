import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { finalizePaymentSuccess, markPaymentFailed } from "../_shared/paymentSuccess.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Payment Reconciliation Worker
 * Checks pending/timeout transactions against eBilling API.
 * Uses: GET {baseUrl}/e_bills/{bill_id} with Basic Auth
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

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

    // eBilling config
    const username = (Deno.env.get("EBILLING_USERNAME") ?? "").trim();
    const sharedKey = (Deno.env.get("EBILLING_SHARED_KEY") ?? "").trim();
    const baseUrl = (Deno.env.get("EBILLING_BASE_URL") ?? "https://lab.billing-easy.net/api/v1/merchant").trim().replace(/\/+$/, "");

    if (!username || !sharedKey) {
      console.error("[reconciliation] Missing eBilling credentials");
      return new Response(JSON.stringify({ error: "Configuration eBilling manquante (credentials)" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[reconciliation] Base URL: ${baseUrl}`);
    const basicAuth = "Basic " + btoa(`${username}:${sharedKey}`);

    let reconciledCount = 0;
    const results: { ref: string; result: string }[] = [];
    const txRowIdCache: Record<string, string | null> = {};

    for (const tx of pending) {
      const ref = tx.ebilling_reference;

      // We need the bill_id to query the invoice. It may be stored in:
      // 1. ebilling_transaction_id column (we now store bill_id there)
      // 2. metadata.bill_id
      // 3. If neither exists, we can't query - skip
      let billId: string | null = null;

      // Try to get bill_id from the full transaction record
      const { data: fullTx } = await supabaseAdmin
        .from("payment_transactions")
        .select("ebilling_transaction_id, metadata")
        .eq("ebilling_reference", ref)
        .single();

      if (fullTx) {
        const meta = fullTx.metadata as Record<string, any> | null;
        billId = meta?.bill_id || fullTx.ebilling_transaction_id || null;
      }

      if (!billId) {
        console.log(`[reconciliation] ref=${ref} → no bill_id, skipping`);
        results.push({ ref, result: "no_bill_id" });
        continue;
      }

      try {
        // Query invoice status
        const queryUrl = `${baseUrl}/e_bills/${billId}`;
        const response = await fetch(queryUrl, {
          method: "GET",
          headers: {
            "Authorization": basicAuth,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        const rawText = await response.text();
        console.log(`[reconciliation] ref=${ref} bill=${billId} HTTP ${response.status}, raw: ${rawText.substring(0, 300)}`);

        let data: any;
        try {
          data = JSON.parse(rawText);
        } catch {
          console.error(`[reconciliation] ref=${ref} non-JSON response`);
          await supabaseAdmin.from("payment_transactions")
            .update({ last_api_response: rawText.substring(0, 500), last_sync_at: new Date().toISOString() })
            .eq("ebilling_reference", ref);
          results.push({ ref, result: "non_json_response" });
          continue;
        }

        // Save API response
        await supabaseAdmin.from("payment_transactions")
          .update({ last_api_response: JSON.stringify(data), last_sync_at: new Date().toISOString() })
          .eq("ebilling_reference", ref);

        const billState = (data?.e_bill?.state || data?.data?.state || data?.state || "").toLowerCase();

        if (billState === "paid" || billState === "success" || billState === "completed") {
          // G1-FIX2: shared atomic success pipeline
          const { data: txRow } = await supabaseAdmin
            .from("payment_transactions").select("id").eq("ebilling_reference", ref).single();
          const result = txRow
            ? await finalizePaymentSuccess(supabaseAdmin, {
                txId: txRow.id, reference: ref, channel: "reconciliation", ebillingTransactionId: billId,
              })
            : { claimed: false };
          if (!result.claimed) {
            results.push({ ref, result: "already_processed" });
            continue;
          }

          // Log the reconciliation
          await supabaseAdmin.from("system_logs").insert({
            event_type: "PAYMENT_RECONCILED",
            details: {
              ebilling_reference: ref,
              bill_id: billId,
              amount: tx.amount,
              deceased: tx.deceased_name_snapshot,
              original_status: tx.status,
              bill_state: billState,
            },
          });

          reconciledCount++;
          console.log(`[reconciliation] ref=${ref} → RECONCILED (${billState})`);
          results.push({ ref, result: "reconciled" });
        } else if (billState === "expired" || billState === "cancelled" || billState === "failed") {
          if (txRowIdCache[ref] === undefined) {
            const { data: r } = await supabaseAdmin
              .from("payment_transactions").select("id").eq("ebilling_reference", ref).single();
            txRowIdCache[ref] = r?.id ?? null;
          }
          if (txRowIdCache[ref]) await markPaymentFailed(supabaseAdmin, txRowIdCache[ref] as string);

          console.log(`[reconciliation] ref=${ref} → FAILED (${billState})`);
          results.push({ ref, result: `failed_${billState}` });
        } else {
          console.log(`[reconciliation] ref=${ref} → still ${billState || tx.status}`);
          results.push({ ref, result: `still_${billState || tx.status}` });
        }
      } catch (apiErr) {
        console.error(`[reconciliation] API error for ref=${ref}:`, apiErr);
        results.push({ ref, result: "api_error" });
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
