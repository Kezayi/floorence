import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    // Fetch up to 10 pending/timeout transactions eligible for reconciliation
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

    const EBILLING_BASE_URL = Deno.env.get("EBILLING_BASE_URL")?.trim();
    const EBILLING_MERCHANT_ID = Deno.env.get("EBILLING_MERCHANT_ID")?.trim();
    const EBILLING_SECRET_KEY = Deno.env.get("EBILLING_SECRET_KEY")?.trim();

    if (!EBILLING_BASE_URL || !EBILLING_MERCHANT_ID) {
      console.error("[reconciliation] Missing eBilling config");
      return new Response(JSON.stringify({ error: "Configuration eBilling manquante" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let reconciledCount = 0;
    const results: { ref: string; result: string }[] = [];

    for (const tx of pending) {
      const ref = tx.ebilling_reference;
      try {
        const statusUrl = new URL("/status", EBILLING_BASE_URL).toString();
        const statusResponse = await fetch(statusUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ppiMerchantId: EBILLING_MERCHANT_ID,
            ppiSecretKey: EBILLING_SECRET_KEY,
            ppiMerchantReference: ref,
          }),
        });

        const rawText = await statusResponse.text();
        console.log(`[reconciliation] ref=${ref} raw response:`, rawText);

        let statusData: any;
        try {
          statusData = JSON.parse(rawText);
        } catch {
          console.error(`[reconciliation] ref=${ref} non-JSON response`);
          // Save raw response for diagnostics
          await supabaseAdmin.from("payment_transactions")
            .update({ last_api_response: { raw: rawText.substring(0, 500) }, last_sync_at: new Date().toISOString() })
            .eq("ebilling_reference", ref);
          results.push({ ref, result: "non_json_response" });
          continue;
        }

        // Save API response to DB for diagnostics
        await supabaseAdmin.from("payment_transactions")
          .update({ last_api_response: statusData, last_sync_at: new Date().toISOString() })
          .eq("ebilling_reference", ref);

        const paymentStatus = (
          statusData?.ppiPaymentStatus ||
          statusData?.status ||
          ""
        ).toUpperCase();

        if (paymentStatus === "SUCCESS" || paymentStatus === "COMPLETED" || paymentStatus === "PAID") {
          // Update transaction to success
          await supabaseAdmin
            .from("payment_transactions")
            .update({
              status: "success",
              last_sync_at: new Date().toISOString(),
              ebilling_transaction_id: statusData?.ppiTransactionId || statusData?.transactionId || null,
            })
            .eq("ebilling_reference", ref);

          // Unhide the associated guestbook post
          await supabaseAdmin
            .from("guestbook_posts")
            .update({ is_hidden: false, updated_at: new Date().toISOString() })
            .eq("payment_reference", ref)
            .eq("is_hidden", true);

          // Log the reconciliation
          await supabaseAdmin.from("system_logs").insert({
            event_type: "PAYMENT_RECONCILED",
            details: {
              ebilling_reference: ref,
              amount: tx.amount,
              deceased: tx.deceased_name_snapshot,
              original_status: tx.status,
              operator_status: paymentStatus,
            },
          });

          reconciledCount++;
          console.log(`Réconciliation automatique réussie pour la réf : ${ref}`);
          results.push({ ref, result: "reconciled" });
        } else {
          console.log(`[reconciliation] ref=${ref} still ${paymentStatus}`);
          results.push({ ref, result: `still_${paymentStatus.toLowerCase() || tx.status}` });
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
