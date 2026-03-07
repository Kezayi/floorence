import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EbillingRequest {
  memorial_id: string;
  item_type: "cierge" | "fleur";
  quantity: number;
  phone?: string;
  post_id?: string;
  deceased_name?: string;
  candle_count?: number;
  flower_count?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body: EbillingRequest = await req.json();
    const { memorial_id, item_type, quantity, phone, post_id, deceased_name, candle_count, flower_count } = body;

    if (!memorial_id || !item_type || !quantity || quantity < 1) {
      return new Response(
        JSON.stringify({ error: "Paramètres invalides" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Server-side truth: check monetization mode
    const { data: monetizationSetting } = await supabaseAdmin
      .from("global_settings")
      .select("value_bool")
      .eq("key", "is_monetized")
      .single();

    const isMonetized = monetizationSetting?.value_bool ?? false;

    // Get dynamic price
    const { data: priceData } = await supabaseAdmin
      .from("ritual_prices")
      .select("unit_price")
      .eq("item_type", item_type)
      .single();

    const unitPrice = priceData?.unit_price ?? 500;
    const totalAmount = unitPrice * quantity;
    const ebillingRef = `FLR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const itemLabel = item_type === "cierge" ? "Cierge" : "Fleur";

    console.log(`[ebilling] mode=${isMonetized ? 'payant' : 'gratuit'}, item=${item_type}, qty=${quantity}, price=${unitPrice}`);

    // ── FREE MODE ──
    if (!isMonetized) {
      const { error: txError } = await supabaseAdmin.from("payment_transactions").insert({
        user_id: user.id,
        memorial_id,
        amount: 0,
        currency: "XOF",
        payment_type: item_type,
        status: "SUCCESS",
        ebilling_reference: ebillingRef,
        payer_phone: phone || null,
        deceased_name_snapshot: deceased_name || null,
        candle_count: candle_count ?? (item_type === "cierge" ? quantity : 0),
        flower_count: flower_count ?? (item_type === "fleur" ? quantity : 0),
        metadata: { mode: "gratuit", quantity, unit_price: 0 },
      });

      if (txError) {
        console.error("[ebilling] Transaction insert error:", txError);
        throw txError;
      }

      // Update guestbook post gesture count
      if (post_id) {
        const column = item_type === "cierge" ? "candle_count" : "flower_count";
        const { data: currentPost } = await supabaseAdmin
          .from("guestbook_posts")
          .select(column)
          .eq("id", post_id)
          .single();

        if (currentPost) {
          const currentCount = (currentPost as any)[column] ?? 0;
          await supabaseAdmin
            .from("guestbook_posts")
            .update({ [column]: currentCount + quantity })
            .eq("id", post_id);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: "gratuit",
          reference: ebillingRef,
          amount: 0,
          unit_price: 0,
          requires_phone: false,
          message: "Geste offert avec succès",
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ── PAID MODE ──
    // Strictly require phone in paid mode
    if (!phone) {
      return new Response(
        JSON.stringify({
          error: "Le numéro de téléphone est requis en mode payant",
          mode: "payant",
          requires_phone: true,
          unit_price: unitPrice,
          amount: totalAmount,
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Record pending transaction
    const { error: txError } = await supabaseAdmin.from("payment_transactions").insert({
      user_id: user.id,
      memorial_id,
      amount: totalAmount,
      currency: "XOF",
      payment_type: item_type,
      status: "pending",
      ebilling_reference: ebillingRef,
      payer_phone: phone,
      deceased_name_snapshot: deceased_name || null,
      candle_count: candle_count ?? (item_type === "cierge" ? quantity : 0),
      flower_count: flower_count ?? (item_type === "fleur" ? quantity : 0),
      metadata: { mode: "payant", quantity, unit_price: unitPrice, phone, post_id: post_id || null },
    });

    if (txError) {
      console.error("[ebilling] Transaction insert error:", txError);
      throw txError;
    }

    // Call eBilling API
    const EBILLING_API_KEY = Deno.env.get("EBILLING_API_KEY");
    const EBILLING_MERCHANT_ID = Deno.env.get("EBILLING_MERCHANT_ID");
    const EBILLING_SECRET_KEY = Deno.env.get("EBILLING_SECRET_KEY");
    const EBILLING_BASE_URL = Deno.env.get("EBILLING_BASE_URL");

    if (!EBILLING_API_KEY || !EBILLING_MERCHANT_ID) {
      return new Response(
        JSON.stringify({ error: "Configuration eBilling manquante" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!EBILLING_BASE_URL) {
      console.error("[ebilling] EBILLING_BASE_URL not configured");
      return new Response(
        JSON.stringify({ error: "Configuration serveur incomplète (BASE_URL)" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ── ENVIRONMENT GUARD: Block if monetized but not pointing to LAB ──
    if (!EBILLING_BASE_URL.includes("lab")) {
      console.error(`[ebilling] BLOCKED: is_monetized=true but EBILLING_BASE_URL=${EBILLING_BASE_URL} does not target LAB environment`);
      return new Response(
        JSON.stringify({ error: "Conflit d'environnement : la monétisation est active mais l'URL cible n'est pas l'environnement LAB. Transaction bloquée par sécurité." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build callback URL with secret for webhook security
    const CALLBACK_SECRET = Deno.env.get("EBILLING_CALLBACK_SECRET") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const callbackUrl = `${supabaseUrl}/functions/v1/ebilling-callback?secret=${encodeURIComponent(CALLBACK_SECRET)}`;

    const ebillingPayload = {
      ppiMerchantId: EBILLING_MERCHANT_ID,
      ppiSecretKey: EBILLING_SECRET_KEY,
      ppiAmount: totalAmount.toString(),
      ppiPayerPhoneNumber: phone,
      ppiNetworkCode: "ALL",
      ppiCurrencyISO: "XOF",
      ppiMerchantReference: ebillingRef,
      ppiDescription: `${itemLabel} x${quantity} - Floorence`,
      ppiCallbackUrl: callbackUrl,
    };

    const checkoutUrl = `${EBILLING_BASE_URL}/checkout`;
    console.log(`[ebilling] Calling checkout at: ${checkoutUrl}`);

    try {
      const ebillingResponse = await fetch(checkoutUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ebillingPayload),
      });

      const ebillingData = await ebillingResponse.json();
      console.log("[ebilling] API response:", JSON.stringify(ebillingData));

      return new Response(
        JSON.stringify({
          success: true,
          mode: "payant",
          reference: ebillingRef,
          amount: totalAmount,
          unit_price: unitPrice,
          requires_phone: true,
          ebilling_response: ebillingData,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch (ebillingError) {
      console.error("[ebilling] API error:", ebillingError);

      await supabaseAdmin
        .from("payment_transactions")
        .update({ status: "FAILED" })
        .eq("ebilling_reference", ebillingRef);

      return new Response(
        JSON.stringify({ error: "Erreur de communication avec le service de paiement" }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error: any) {
    console.error("[ebilling] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
