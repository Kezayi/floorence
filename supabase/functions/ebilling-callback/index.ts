import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    console.log("[ebilling-callback] Received (authenticated):", JSON.stringify(callbackData));

    // eBilling callback fields (from official docs):
    // reference = our external_reference (ebilling_reference in DB)
    // amount, transactionid, paymentsystem, billingid, merchantid, customerid
    const ebillingRef = callbackData.reference || callbackData.ppiMerchantReference;
    const transactionId = callbackData.transactionid || callbackData.ppiTransactionId || callbackData.billingid;
    // eBilling callback is only sent on SUCCESS (per docs)
    // But we handle potential status field just in case
    const status = (callbackData.status || callbackData.ppiPaymentStatus || "SUCCESS").toUpperCase();

    if (!ebillingRef) {
      console.error("[ebilling-callback] No reference in callback data");
      return new Response(
        JSON.stringify({ error: "Missing reference" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Find the transaction
    const { data: tx, error: txError } = await supabaseAdmin
      .from("payment_transactions")
      .select("id, memorial_id, payment_type, status, metadata")
      .eq("ebilling_reference", ebillingRef)
      .maybeSingle();

    if (txError || !tx) {
      console.error("[ebilling-callback] Transaction not found:", ebillingRef);
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Already processed
    if (tx.status === "success") {
      return new Response(
        JSON.stringify({ success: true, message: "Already processed" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (status === "SUCCESS" || status === "PAID" || status === "COMPLETED") {
      // Update transaction to success — conditional, so concurrent duplicate callbacks credit once
      const { data: claimed } = await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "success",
          ebilling_transaction_id: transactionId || null,
          last_api_response: JSON.stringify(callbackData),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tx.id)
        .neq("status", "success")
        .select("id");
      if (!claimed || claimed.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "Already processed" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const metadata = tx.metadata as Record<string, any> | null;
      const postId = metadata?.post_id;
      const quantity = metadata?.quantity || 1;
      const itemType = tx.payment_type;

      // Update guestbook post gesture counts
      if (postId) {
        const column = itemType === "cierge" ? "candle_count" : "flower_count";
        const { data: currentPost } = await supabaseAdmin
          .from("guestbook_posts")
          .select(`${column}, is_hidden`)
          .eq("id", postId)
          .single();

        if (currentPost) {
          const currentCount = (currentPost as any)[column] ?? 0;
          await supabaseAdmin
            .from("guestbook_posts")
            .update({ [column]: currentCount + quantity, is_hidden: false })
            .eq("id", postId);
        }
      }

      // Unhide any post linked via payment_reference
      await supabaseAdmin
        .from("guestbook_posts")
        .update({ is_hidden: false, updated_at: new Date().toISOString() })
        .eq("payment_reference", ebillingRef)
        .eq("is_hidden", true);

      console.log("[ebilling-callback] Payment confirmed:", ebillingRef);

      // Trigger certificate generation & email (non-blocking)
      try {
        const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-payment-success`;
        const certRes = await fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ transaction_id: tx.id }),
        });
        const certData = await certRes.json();
        console.log("[ebilling-callback] Certificate result:", JSON.stringify(certData));
      } catch (certErr) {
        console.error("[ebilling-callback] Certificate generation failed (non-blocking):", certErr);
      }
    } else if (status === "FAILED" || status === "CANCELLED" || status === "EXPIRED") {
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "failed",
          ebilling_transaction_id: transactionId || null,
          last_api_response: JSON.stringify(callbackData),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tx.id);

      console.log("[ebilling-callback] Payment failed:", ebillingRef);
    } else {
      console.log("[ebilling-callback] Unknown status:", status, "for ref:", ebillingRef);
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
