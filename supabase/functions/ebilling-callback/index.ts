import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { finalizePaymentSuccess, markPaymentFailed } from "../_shared/paymentSuccess.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * eBilling Webhook Callback
 * Called by eBilling when a payment is validated.
 *
 * According to the official eBilling docs, the callback sends a POST with:
 * - reference (= our external_reference / ebilling_reference)
 * - amount
 * - transactionid
 * - paymentsystem
 * - billingid (= bill_id)
 * - merchantid
 * - customerid
 *
 * SECURED by shared secret token validation (query param or header).
 */
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── SECURITY: Validate callback secret ──
    const CALLBACK_SECRET = Deno.env.get("EBILLING_CALLBACK_SECRET");
    if (!CALLBACK_SECRET) {
      console.error("[ebilling-callback] EBILLING_CALLBACK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const url = new URL(req.url);
    const headerSecret = req.headers.get("x-callback-secret");
    const paramSecret = url.searchParams.get("secret");
    const providedSecret = headerSecret || paramSecret;

    if (!providedSecret || providedSecret !== CALLBACK_SECRET) {
      console.warn("[ebilling-callback] Invalid or missing callback secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Parse body - eBilling may send form-data or JSON
    let callbackData: Record<string, any> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      callbackData = await req.json();
    } else if (contentType.includes("form")) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        callbackData[key] = value;
      });
    } else {
      // Try JSON first, fallback to URL params
      try {
        callbackData = await req.json();
      } catch {
        // Check URL search params as last resort
        url.searchParams.forEach((value, key) => {
          if (key !== "secret") callbackData[key] = value;
        });
      }
    }

    const json = (body: unknown, status: number) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    const str = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());

    const ebillingRef = str(callbackData.reference) || str(callbackData.ppiMerchantReference);
    const billingId = str(callbackData.billingid);
    const transactionId = str(callbackData.transactionid) || str(callbackData.ppiTransactionId) || billingId;

    // G2-SEC3: fail-closed state resolution — no implicit default, `state` first.
    const SUCCESS_STATES = new Set(["SUCCESS", "PAID", "COMPLETED"]);
    const FAILURE_STATES = new Set(["FAILED", "CANCELLED", "EXPIRED"]);
    const rawStates = [callbackData.state, callbackData.status, callbackData.ppiPaymentStatus]
      .map((v) => str(v).toUpperCase())
      .filter((v) => v.length > 0);
    const category = (s: string) =>
      SUCCESS_STATES.has(s) ? "success" : FAILURE_STATES.has(s) ? "failure" : `other:${s}`;

    if (!ebillingRef) {
      console.warn("[ebilling-callback] Rejected: missing reference");
      return json({ error: "Missing reference" }, 400);
    }
    if (rawStates.length === 0) {
      console.warn("[ebilling-callback] Rejected: missing state, ref=", ebillingRef);
      return json({ error: "Missing state" }, 400);
    }
    if (new Set(rawStates.map(category)).size > 1) {
      console.warn("[ebilling-callback] Rejected: conflicting state fields, ref=", ebillingRef);
      return json({ error: "Conflicting state" }, 422);
    }
    const status = rawStates[0];

    const { data: tx, error: txError } = await supabaseAdmin
      .from("payment_transactions")
      .select("id, memorial_id, payment_type, status, metadata, amount, ebilling_transaction_id")
      .eq("ebilling_reference", ebillingRef)
      .maybeSingle();

    if (txError || !tx) {
      console.warn("[ebilling-callback] Rejected: unknown reference", ebillingRef);
      return json({ error: "Transaction not found" }, 404);
    }

    // Bill identity: if both sides know the bill id, they must match.
    const storedBillId = str((tx.metadata as Record<string, unknown> | null)?.bill_id) || str(tx.ebilling_transaction_id);
    if (billingId && storedBillId && billingId !== storedBillId) {
      console.warn("[ebilling-callback] Rejected: bill id mismatch, ref=", ebillingRef);
      return json({ error: "Bill mismatch" }, 422);
    }

    if (tx.status === "success") {
      return json({ success: true, message: "Already processed" }, 200);
    }

    if (SUCCESS_STATES.has(status)) {
      // Exact integer XAF amount, no tolerance.
      const rawAmount = str(callbackData.amount);
      const expected = Number(tx.amount);
      const received = /^\d+(\.0+)?$/.test(rawAmount) ? Number(rawAmount) : NaN;
      if (!Number.isSafeInteger(received) || !Number.isSafeInteger(expected) || received !== expected) {
        console.warn("[ebilling-callback] Rejected: amount mismatch or invalid, ref=", ebillingRef);
        return json({ error: "Amount mismatch" }, 422);
      }

      const result = await finalizePaymentSuccess(supabaseAdmin, {
        txId: tx.id,
        reference: ebillingRef,
        channel: "callback",
        ebillingTransactionId: transactionId || null,
        lastApiResponse: JSON.stringify(callbackData),
      });
      if (!result.claimed) {
        return json({ success: true, message: "Already processed" }, 200);
      }
      console.log("[ebilling-callback] Payment confirmed:", ebillingRef);
    } else if (FAILURE_STATES.has(status)) {
      await markPaymentFailed(supabaseAdmin, tx.id, {
        ebilling_transaction_id: transactionId || null,
        last_api_response: JSON.stringify(callbackData),
      });
      console.log("[ebilling-callback] Payment failed:", ebillingRef);
    } else {
      console.log("[ebilling-callback] Non-final state, no effect:", status, "ref:", ebillingRef);
    }

    return new Response(
      JSON.stringify({ success: true, status }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("[ebilling-callback] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
