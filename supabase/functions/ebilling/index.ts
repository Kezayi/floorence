import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { "Content-Type": "application/json", ...corsHeaders };

// ── FLEXIBLE URL BUILDER ──
function buildEbillingUrl(endpoint: "status" | "checkout"): string {
  const baseUrl = (Deno.env.get("EBILLING_BASE_URL") ?? "").trim().replace(/\/+$/, '');
  // If baseUrl already contains a path (e.g. /api/v1), append directly
  // Otherwise use the default root-level route
  return `${baseUrl}/${endpoint}`;
}

// ── SECRETS VALIDATION ──
const REQUIRED_KEYS = ["EBILLING_MERCHANT_ID", "EBILLING_SECRET_KEY", "EBILLING_BASE_URL"];

function validateSecrets(): string | null {
  for (const key of REQUIRED_KEYS) {
    const val = Deno.env.get(key)?.trim();
    if (!val) return key;
  }
  return null;
}

function initClients(authHeader: string) {
  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  return { supabaseUser, supabaseAdmin };
}

// ── CHECK-STATUS HANDLER ──
async function handleCheckStatus(body: any, supabaseAdmin: any): Promise<Response> {
  const { reference } = body;
  if (!reference) {
    return new Response(JSON.stringify({ error: "Référence manquante" }), { status: 400, headers: jsonHeaders });
  }

  const { data: tx, error: txErr } = await supabaseAdmin
    .from("payment_transactions")
    .select("id, status, ebilling_reference, memorial_id, metadata, last_api_response")
    .eq("ebilling_reference", reference)
    .single();

  if (txErr || !tx) {
    return new Response(JSON.stringify({ error: "Transaction introuvable" }), { status: 404, headers: jsonHeaders });
  }

  if (tx.status === "success") {
    return new Response(JSON.stringify({ success: true, already_confirmed: true, status: "success", last_api_response: tx.last_api_response }), { status: 200, headers: jsonHeaders });
  }
  if (tx.status === "failed") {
    return new Response(JSON.stringify({ success: false, status: "failed", message: "Cette transaction a échoué définitivement", last_api_response: tx.last_api_response }), { status: 200, headers: jsonHeaders });
  }

  const EBILLING_BASE_URL = Deno.env.get("EBILLING_BASE_URL")?.trim();
  const EBILLING_MERCHANT_ID = Deno.env.get("EBILLING_MERCHANT_ID")?.trim();
  const EBILLING_SECRET_KEY = Deno.env.get("EBILLING_SECRET_KEY")?.trim();

  if (!EBILLING_BASE_URL || !EBILLING_MERCHANT_ID) {
    return new Response(JSON.stringify({ error: "Configuration eBilling manquante" }), { status: 500, headers: jsonHeaders });
  }

  try {
    const statusUrl = buildEbillingUrl("status");
    console.log(`[ebilling:check-status] Base URL détectée: ${Deno.env.get("EBILLING_BASE_URL")?.trim()}`);
    console.log(`[ebilling:check-status] Querying ${statusUrl} for ref=${reference}`);

    const statusPayload = {
      ppiMerchantId: EBILLING_MERCHANT_ID,
      ppiSecretKey: EBILLING_SECRET_KEY,
      ppiApiKey: Deno.env.get("EBILLING_API_KEY")?.trim() || undefined,
      ppiMerchantReference: reference,
    };

    const statusResponse = await fetch(statusUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify(statusPayload),
    });

    console.log("[ebilling:check-status] HTTP status:", statusResponse.status);

    if (statusResponse.status === 404) {
      console.log(`[ebilling:check-status] ref=${reference} → 404, transaction non encore initiée côté opérateur`);
      return new Response(JSON.stringify({
        success: false,
        status: tx.status,
        payment_status: "NOT_INITIATED",
        message: "Transaction non encore initiée côté opérateur. Réessayez dans quelques instants.",
      }), { status: 200, headers: jsonHeaders });
    }

    const rawText = await statusResponse.text();
    console.log("[ebilling:check-status] Raw API response body:", rawText);

    let statusData: any;
    try {
      statusData = JSON.parse(rawText);
    } catch {
      console.error("[ebilling:check-status] Non-JSON response from API");
      return new Response(JSON.stringify({
        success: false,
        status: tx.status,
        message: `Réponse non-JSON de l'opérateur (HTTP ${statusResponse.status}): ${rawText.substring(0, 200)}`,
      }), { status: 200, headers: jsonHeaders });
    }

    await supabaseAdmin
      .from("payment_transactions")
      .update({ last_api_response: statusData, last_sync_at: new Date().toISOString() })
      .eq("ebilling_reference", reference);

    if (statusData?.error || statusData?.errorMessage || (statusData?.message && !statusResponse.ok)) {
      const apiErrorMsg = statusData.error || statusData.errorMessage || statusData.message || "Erreur inconnue";
      console.error("[ebilling:check-status] API error response:", apiErrorMsg);
      return new Response(JSON.stringify({
        success: false,
        status: tx.status,
        message: `Erreur Opérateur : ${apiErrorMsg}`,
        last_api_response: statusData,
      }), { status: 200, headers: jsonHeaders });
    }

    const paymentStatus = (statusData?.ppiPaymentStatus || statusData?.status || "").toUpperCase();

    if (paymentStatus === "SUCCESS" || paymentStatus === "COMPLETED" || paymentStatus === "PAID") {
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "success",
          last_sync_at: new Date().toISOString(),
          ebilling_transaction_id: statusData?.ppiTransactionId || statusData?.transactionId || null,
        })
        .eq("ebilling_reference", reference);

      await supabaseAdmin
        .from("guestbook_posts")
        .update({ is_hidden: false, updated_at: new Date().toISOString() })
        .eq("payment_reference", reference)
        .eq("is_hidden", true);

      console.log(`[ebilling:check-status] ref=${reference} → SUCCESS, hommage publié`);

      return new Response(JSON.stringify({
        success: true,
        status: "success",
        message: "Transaction validée et hommage publié",
      }), { status: 200, headers: jsonHeaders });
    }

    console.log(`[ebilling:check-status] ref=${reference} → still ${paymentStatus}`);
    return new Response(JSON.stringify({
      success: false,
      status: tx.status,
      payment_status: paymentStatus,
      message: "Le paiement n'est toujours pas confirmé",
      last_api_response: statusData,
    }), { status: 200, headers: jsonHeaders });

  } catch (apiError) {
    const attemptedUrl = EBILLING_BASE_URL ? new URL("/status", EBILLING_BASE_URL).toString() : "URL non configurée";
    console.error("[ebilling:check-status] API error:", apiError);
    return new Response(JSON.stringify({
      success: false,
      status: tx.status,
      message: `URL tentée: ${attemptedUrl} - Erreur: ${(apiError as Error).message || "Impossible de vérifier le statut"}`,
    }), { status: 200, headers: jsonHeaders });
  }
}

// ── MAIN HANDLER ──
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── SECRETS VALIDATION ──
    const missingKey = validateSecrets();
    if (missingKey) {
      console.error(`[ebilling] FATAL: Missing secret: ${missingKey}`);
      return new Response(
        JSON.stringify({ error: `Configuration serveur incomplète: ${missingKey} manquant` }),
        { status: 500, headers: jsonHeaders }
      );
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: jsonHeaders });
    }

    const { supabaseUser, supabaseAdmin } = initClients(authHeader);

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: jsonHeaders });
    }

    const body = await req.json();
    console.log("[EBILLING] Payload reçu:", JSON.stringify(body));

    // ── ROUTE: check-status ──
    if (body.action === "check-status") {
      return await handleCheckStatus(body, supabaseAdmin);
    }

    // ── ROUTE: default (create payment) ──
    const { memorial_id, item_type, quantity, phone, post_id, deceased_name, candle_count, flower_count } = body;

    if (!memorial_id || !item_type || !quantity || quantity < 1) {
      return new Response(JSON.stringify({ error: "Paramètres invalides" }), { status: 400, headers: jsonHeaders });
    }

    // Fallback: if deceased_name missing, look it up from memorials table
    let resolvedDeceasedName = deceased_name || null;
    if (!resolvedDeceasedName && memorial_id) {
      const { data: memData } = await supabaseAdmin
        .from("memorials")
        .select("first_name, last_name")
        .eq("id", memorial_id)
        .single();
      if (memData) {
        resolvedDeceasedName = `${memData.first_name} ${memData.last_name}`.trim();
      }
      console.log(`[ebilling] Fallback name lookup: ${resolvedDeceasedName}`);
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
    const ebillingRef = `FLR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
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
        status: "success",
        ebilling_reference: ebillingRef,
        payer_phone: phone || null,
        deceased_name_snapshot: resolvedDeceasedName,
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
        { status: 200, headers: jsonHeaders }
      );
    }

    // ── PAID MODE ──
    if (!phone) {
      return new Response(
        JSON.stringify({
          error: "Le numéro de téléphone est requis en mode payant",
          mode: "payant",
          requires_phone: true,
          unit_price: unitPrice,
          amount: totalAmount,
        }),
        { status: 400, headers: jsonHeaders }
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
      deceased_name_snapshot: resolvedDeceasedName,
      candle_count: candle_count ?? (item_type === "cierge" ? quantity : 0),
      flower_count: flower_count ?? (item_type === "fleur" ? quantity : 0),
      metadata: { mode: "payant", quantity, unit_price: unitPrice, phone, post_id: post_id || null },
    });

    if (txError) {
      console.error("[ebilling] Transaction insert error:", txError);
      throw txError;
    }

    // Call eBilling API
    const EBILLING_API_KEY = Deno.env.get("EBILLING_API_KEY")?.trim();
    const EBILLING_MERCHANT_ID = Deno.env.get("EBILLING_MERCHANT_ID")?.trim()!;
    const EBILLING_SECRET_KEY = Deno.env.get("EBILLING_SECRET_KEY")?.trim()!;
    const EBILLING_BASE_URL = Deno.env.get("EBILLING_BASE_URL")?.trim()!;

    // ── ENVIRONMENT GUARD ──
    if (!EBILLING_BASE_URL.includes("lab")) {
      console.error(`[ebilling] BLOCKED: is_monetized=true but EBILLING_BASE_URL=${EBILLING_BASE_URL} does not target LAB environment`);
      return new Response(
        JSON.stringify({ error: "Conflit d'environnement : la monétisation est active mais l'URL cible n'est pas l'environnement LAB. Transaction bloquée par sécurité." }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // Build callback URL
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

    const checkoutUrl = buildEbillingUrl("checkout");
    console.log(`[ebilling] Base URL détectée: ${EBILLING_BASE_URL}`);
    console.log(`[ebilling] Calling checkout at: ${checkoutUrl}`);

    try {
      const ebillingResponse = await fetch(checkoutUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        body: JSON.stringify(ebillingPayload),
      });

      // ── ROBUST RESPONSE PARSING (anti-crash on HTML/404) ──
      const rawText = await ebillingResponse.text();
      console.log(`[ebilling] Checkout HTTP ${ebillingResponse.status}, raw response: ${rawText.substring(0, 500)}`);

      let ebillingData: any;
      try {
        ebillingData = JSON.parse(rawText);
      } catch {
        console.error("[ebilling] Non-JSON response from checkout API");
        // Don't crash — mark as failed and return useful error
        await supabaseAdmin
          .from("payment_transactions")
          .update({ status: "failed", last_api_response: { raw: rawText.substring(0, 500), http_status: ebillingResponse.status } })
          .eq("ebilling_reference", ebillingRef);

        return new Response(
          JSON.stringify({
            error: `L'opérateur a renvoyé une réponse invalide (HTTP ${ebillingResponse.status}). Vérifiez la configuration eBilling.`,
            details: rawText.substring(0, 200),
          }),
          { status: 502, headers: jsonHeaders }
        );
      }

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
        { status: 200, headers: jsonHeaders }
      );
    } catch (ebillingError) {
      console.error("[ebilling] API fetch error:", ebillingError);

      await supabaseAdmin
        .from("payment_transactions")
        .update({ status: "failed" })
        .eq("ebilling_reference", ebillingRef);

      return new Response(
        JSON.stringify({ error: `Erreur réseau avec l'opérateur: ${(ebillingError as Error).message}` }),
        { status: 502, headers: jsonHeaders }
      );
    }
  } catch (error: any) {
    console.error("[ebilling] UNHANDLED ERROR:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue", stack: error.stack }),
      { status: 500, headers: jsonHeaders }
    );
  }
};

serve(handler);
