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
 * SECURED by shared secret token validation.
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

    // Check secret from header first, then query param as fallback
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

    const body = await req.json();
    console.log("[ebilling-callback] Received (authenticated):", JSON.stringify(body));

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
    if (tx.status === "success") {
      return new Response(
        JSON.stringify({ success: true, message: "Already processed" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedStatus = (ppiPaymentStatus || "").toUpperCase();

    if (normalizedStatus === "SUCCESS") {
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "success",
          ebilling_transaction_id: ppiTransactionId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tx.id);

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
      console.log("[ebilling-callback] Unknown status:", normalizedStatus);
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
