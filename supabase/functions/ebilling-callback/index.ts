import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * eBilling Webhook Callback
 * Called by eBilling when a payment status changes.
 * Expected payload from eBilling:
 * {
 *   "ppiMerchantReference": "FLR-...",
 *   "ppiTransactionId": "...",
 *   "ppiPaymentStatus": "SUCCESS" | "FAILED" | "PENDING",
 *   "ppiAmount": "500",
 *   "ppiPayerPhoneNumber": "077..."
 * }
 */
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    console.log("[ebilling-callback] Received:", JSON.stringify(body));

    const {
      ppiMerchantReference,
      ppiTransactionId,
      ppiPaymentStatus,
    } = body;

    if (!ppiMerchantReference) {
      return new Response(
        JSON.stringify({ error: "Missing ppiMerchantReference" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Find the transaction
    const { data: tx, error: txError } = await supabaseAdmin
      .from("payment_transactions")
      .select("id, memorial_id, payment_type, status, metadata")
      .eq("ebilling_reference", ppiMerchantReference)
      .maybeSingle();

    if (txError || !tx) {
      console.error("[ebilling-callback] Transaction not found:", ppiMerchantReference);
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Already processed
    if (tx.status === "SUCCESS") {
      console.log("[ebilling-callback] Already processed:", ppiMerchantReference);
      return new Response(
        JSON.stringify({ success: true, message: "Already processed" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedStatus = (ppiPaymentStatus || "").toUpperCase();

    if (normalizedStatus === "SUCCESS") {
      // Update transaction to SUCCESS
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "SUCCESS",
          ebilling_transaction_id: ppiTransactionId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tx.id);

      // Update guestbook post gesture count
      const metadata = tx.metadata as Record<string, any> | null;
      const postId = metadata?.post_id;
      const quantity = metadata?.quantity || 1;
      const itemType = tx.payment_type;

      if (postId) {
        const column = itemType === "cierge" ? "candle_count" : "flower_count";
        const { data: currentPost } = await supabaseAdmin
          .from("guestbook_posts")
          .select(column)
          .eq("id", postId)
          .single();

        if (currentPost) {
          const currentCount = (currentPost as any)[column] ?? 0;
          await supabaseAdmin
            .from("guestbook_posts")
            .update({ [column]: currentCount + quantity })
            .eq("id", postId);
        }
      }

      console.log("[ebilling-callback] Payment confirmed:", ppiMerchantReference);
    } else if (normalizedStatus === "FAILED") {
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "FAILED",
          ebilling_transaction_id: ppiTransactionId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tx.id);

      console.log("[ebilling-callback] Payment failed:", ppiMerchantReference);
    } else {
      console.log("[ebilling-callback] Unknown status:", normalizedStatus, "for", ppiMerchantReference);
    }

    return new Response(
      JSON.stringify({ success: true, status: normalizedStatus }),
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
