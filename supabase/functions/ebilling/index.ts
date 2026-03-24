import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { "Content-Type": "application/json", ...corsHeaders };

// ── eBilling API Config (from official docs) ──
// Base URL: https://lab.billing-easy.net/api/v1/merchant/
// Auth: Basic Auth (Username:SharedKey)
// Payment portal: https://test.billing-easy.net

function getEbillingConfig() {
  const username = (Deno.env.get("EBILLING_USERNAME") ?? "").trim();
  const sharedKey = (Deno.env.get("EBILLING_SHARED_KEY") ?? "").trim();
  const baseUrl = (Deno.env.get("EBILLING_BASE_URL") ?? "https://lab.billing-easy.net/api/v1/merchant").trim().replace(/\/+$/, "");
  const portalBaseUrl = "https://test.billing-easy.net";

  return { username, sharedKey, baseUrl, portalBaseUrl };
}

function buildBasicAuth(username: string, sharedKey: string): string {
  return "Basic " + btoa(`${username}:${sharedKey}`);
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

// ── CHECK-STATUS: Query invoice by bill_id ──
// Uses: GET {baseUrl}/e_bills/{bill_id} OR we store bill_id in metadata
// Fallback: We query using the ebilling_reference stored as external_reference
async function handleCheckStatus(body: any, supabaseAdmin: any): Promise<Response> {
  const { reference } = body;
  if (!reference) {
    return new Response(JSON.stringify({ error: "Référence manquante" }), { status: 400, headers: jsonHeaders });
  }

  const { data: tx, error: txErr } = await supabaseAdmin
    .from("payment_transactions")
    .select("id, status, ebilling_reference, memorial_id, metadata, last_api_response, ebilling_transaction_id")
    .eq("ebilling_reference", reference)
    .single();

  if (txErr || !tx) {
    return new Response(JSON.stringify({ error: "Transaction introuvable" }), { status: 404, headers: jsonHeaders });
  }

  if (tx.status === "success") {
    return new Response(JSON.stringify({ success: true, already_confirmed: true, status: "success" }), { status: 200, headers: jsonHeaders });
  }
  if (tx.status === "failed") {
    return new Response(JSON.stringify({ success: false, status: "failed", message: "Cette transaction a échoué définitivement" }), { status: 200, headers: jsonHeaders });
  }

  // We need the bill_id to query the invoice status
  const metadata = tx.metadata as Record<string, any> | null;
  const billId = metadata?.bill_id || tx.ebilling_transaction_id;

  if (!billId) {
    console.log(`[ebilling:check-status] ref=${reference} → no bill_id stored, cannot query status`);
    return new Response(JSON.stringify({
      success: false,
      status: tx.status,
      payment_status: "NO_BILL_ID",
      message: "Aucun identifiant de facture eBilling. Le paiement n'a peut-être pas été initié correctement.",
    }), { status: 200, headers: jsonHeaders });
  }

  const { username, sharedKey, baseUrl } = getEbillingConfig();

  if (!username || !sharedKey) {
    return new Response(JSON.stringify({ error: "Configuration eBilling manquante (credentials)" }), { status: 500, headers: jsonHeaders });
  }

  try {
    // Query invoice status: the eBilling guide doesn't have a dedicated status endpoint,
    // but the SHAP API has GET /query-invoice/{bill_id}
    // We'll try the e_bills endpoint first
    const queryUrl = `${baseUrl}/e_bills/${billId}`;
    console.log(`[ebilling:check-status] Querying ${queryUrl} for bill_id=${billId}`);

    const response = await fetch(queryUrl, {
      method: "GET",
      headers: {
        "Authorization": buildBasicAuth(username, sharedKey),
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const rawText = await response.text();
    console.log(`[ebilling:check-status] HTTP ${response.status}, raw: ${rawText.substring(0, 500)}`);

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("[ebilling:check-status] Non-JSON response");
      return new Response(JSON.stringify({
        success: false,
        status: tx.status,
        message: `Réponse non-JSON de l'opérateur (HTTP ${response.status})`,
      }), { status: 200, headers: jsonHeaders });
    }

    // Save API response
    await supabaseAdmin
      .from("payment_transactions")
      .update({ last_api_response: JSON.stringify(data), last_sync_at: new Date().toISOString() })
      .eq("ebilling_reference", reference);

    // Check state from e_bill response
    const billState = (data?.e_bill?.state || data?.data?.state || data?.state || "").toLowerCase();

    if (billState === "paid" || billState === "success" || billState === "completed") {
      // Payment confirmed!
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "success",
          last_sync_at: new Date().toISOString(),
          ebilling_transaction_id: data?.e_bill?.bill_id || data?.data?.bill_id || billId,
        })
        .eq("ebilling_reference", reference);

      await supabaseAdmin
        .from("guestbook_posts")
        .update({ is_hidden: false, updated_at: new Date().toISOString() })
        .eq("payment_reference", reference)
        .eq("is_hidden", true);

      console.log(`[ebilling:check-status] ref=${reference} → PAID, hommage publié`);

      return new Response(JSON.stringify({
        success: true,
        status: "success",
        message: "Transaction validée et hommage publié",
      }), { status: 200, headers: jsonHeaders });
    }

    if (billState === "ready" || billState === "pending") {
      return new Response(JSON.stringify({
        success: false,
        status: tx.status,
        payment_status: "NOT_INITIATED",
        message: "Paiement en attente. Tapez votre code secret sur votre téléphone.",
      }), { status: 200, headers: jsonHeaders });
    }

    if (billState === "expired" || billState === "cancelled" || billState === "failed") {
      await supabaseAdmin
        .from("payment_transactions")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("ebilling_reference", reference);

      return new Response(JSON.stringify({
        success: false,
        status: "failed",
        payment_status: billState.toUpperCase(),
        message: `Paiement ${billState}. Veuillez réessayer.`,
      }), { status: 200, headers: jsonHeaders });
    }

    console.log(`[ebilling:check-status] ref=${reference} → unknown state: ${billState}`);
    return new Response(JSON.stringify({
      success: false,
      status: tx.status,
      payment_status: billState || "UNKNOWN",
      message: "Statut inconnu, réessayez dans quelques instants.",
    }), { status: 200, headers: jsonHeaders });

  } catch (apiError) {
    console.error("[ebilling:check-status] API error:", apiError);
    return new Response(JSON.stringify({
      success: false,
      status: tx.status,
      message: `Erreur: ${(apiError as Error).message || "Impossible de vérifier le statut"}`,
    }), { status: 200, headers: jsonHeaders });
  }
}

// ── MAIN HANDLER ──
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { username, sharedKey, baseUrl, portalBaseUrl } = getEbillingConfig();

    if (!username || !sharedKey) {
      console.error("[ebilling] FATAL: Missing EBILLING_USERNAME or EBILLING_SHARED_KEY");
      return new Response(
        JSON.stringify({ error: "Configuration serveur incomplète: identifiants eBilling manquants" }),
        { status: 500, headers: jsonHeaders }
      );
    }

    console.log(`[EBILLING] Base URL détectée: ${baseUrl}`);

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

    // Fallback: if deceased_name missing, look it up
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

    console.log(`[ebilling] mode=${isMonetized ? "payant" : "gratuit"}, item=${item_type}, qty=${quantity}, price=${unitPrice}`);

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

    // ── ENVIRONMENT GUARD ──
    if (!baseUrl.includes("lab")) {
      console.error(`[ebilling] BLOCKED: is_monetized=true but EBILLING_BASE_URL=${baseUrl} does not target LAB environment`);
      return new Response(
        JSON.stringify({ error: "Conflit d'environnement : la monétisation est active mais l'URL cible n'est pas l'environnement LAB. Transaction bloquée par sécurité." }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // ── STEP 1: Create e_bill (invoice) ──
    // POST https://lab.billing-easy.net/api/v1/merchant/e_bills
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const CALLBACK_SECRET = Deno.env.get("EBILLING_CALLBACK_SECRET") ?? "";
    const callbackUrl = `${supabaseUrl}/functions/v1/ebilling-callback?secret=${encodeURIComponent(CALLBACK_SECRET)}`;
    const paymentSuccessUrl = `https://floorence.lovable.app/paiement-succes?reference=${ebillingRef}`;

    const createBillUrl = `${baseUrl}/e_bills`;
    const createBillPayload = {
      payer_msisdn: phone,
      payer_email: user.email || "client@floorence.com",
      payer_name: resolvedDeceasedName ? `Hommage - ${resolvedDeceasedName}` : "Hommage Floorence",
      amount: totalAmount.toString(),
      external_reference: ebillingRef,
      short_description: `${itemLabel} x${quantity} - Floorence`,
      expiry_period: "30",
    };

    console.log(`[ebilling] Creating bill at: ${createBillUrl}`);
    console.log(`[ebilling] Payload:`, JSON.stringify(createBillPayload));

    const billResponse = await fetch(createBillUrl, {
      method: "POST",
      headers: {
        "Authorization": buildBasicAuth(username, sharedKey),
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify(createBillPayload),
    });

    const rawBillText = await billResponse.text();
    console.log(`[ebilling] Create bill HTTP ${billResponse.status}, raw: ${rawBillText.substring(0, 500)}`);

    let billData: any;
    try {
      billData = JSON.parse(rawBillText);
    } catch {
      console.error("[ebilling] Non-JSON response from create bill API");
      // Record failed transaction
      await supabaseAdmin.from("payment_transactions").insert({
        user_id: user.id,
        memorial_id,
        amount: totalAmount,
        currency: "XOF",
        payment_type: item_type,
        status: "failed",
        ebilling_reference: ebillingRef,
        payer_phone: phone,
        deceased_name_snapshot: resolvedDeceasedName,
        candle_count: candle_count ?? (item_type === "cierge" ? quantity : 0),
        flower_count: flower_count ?? (item_type === "fleur" ? quantity : 0),
        last_api_response: rawBillText.substring(0, 500),
        metadata: { mode: "payant", quantity, unit_price: unitPrice, error: "non_json_response" },
      });

      return new Response(
        JSON.stringify({
          error: `L'opérateur a renvoyé une réponse invalide (HTTP ${billResponse.status}). Vérifiez la configuration eBilling.`,
          details: rawBillText.substring(0, 200),
        }),
        { status: 502, headers: jsonHeaders }
      );
    }

    // Check for API errors
    if (billData?.error_code || billData?.error) {
      console.error("[ebilling] API error:", JSON.stringify(billData));
      await supabaseAdmin.from("payment_transactions").insert({
        user_id: user.id,
        memorial_id,
        amount: totalAmount,
        currency: "XOF",
        payment_type: item_type,
        status: "failed",
        ebilling_reference: ebillingRef,
        payer_phone: phone,
        deceased_name_snapshot: resolvedDeceasedName,
        last_api_response: JSON.stringify(billData),
        metadata: { mode: "payant", quantity, unit_price: unitPrice, error: billData.error_description || billData.error },
      });

      return new Response(
        JSON.stringify({
          error: `Erreur eBilling: ${billData.error_description || billData.error || "Erreur inconnue"}`,
          error_code: billData.error_code,
        }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // Extract bill_id from response
    const billId = billData?.e_bill?.bill_id || billData?.bill_id;
    if (!billId) {
      console.error("[ebilling] No bill_id in response:", JSON.stringify(billData));
      return new Response(
        JSON.stringify({ error: "L'opérateur n'a pas retourné d'identifiant de facture (bill_id)" }),
        { status: 502, headers: jsonHeaders }
      );
    }

    console.log(`[ebilling] Bill created: bill_id=${billId}`);

    // ── STEP 2: Send USSD Push ──
    // Detect operator from phone number (Gabon):
    // 07x = Airtel Money ("airtelmoney")
    // 06x = Moov Money ("moovmoney4")
    const cleanPhone = phone.replace(/\s+/g, "").replace(/^\+241/, "");
    let paymentSystemName = "airtelmoney"; // default
    if (cleanPhone.startsWith("06")) {
      paymentSystemName = "moovmoney4";
    } else if (cleanPhone.startsWith("07")) {
      paymentSystemName = "airtelmoney";
    }

    const ussdPushUrl = `${baseUrl}/e_bills/${billId}/ussd_push`;
    const ussdPayload = {
      payer_msisdn: phone,
      payment_system_name: paymentSystemName,
    };

    console.log(`[ebilling] Sending USSD push to ${ussdPushUrl}`, JSON.stringify(ussdPayload));

    let ussdSuccess = false;
    let ussdData: any = null;

    try {
      const ussdResponse = await fetch(ussdPushUrl, {
        method: "POST",
        headers: {
          "Authorization": buildBasicAuth(username, sharedKey),
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        body: JSON.stringify(ussdPayload),
      });

      const rawUssdText = await ussdResponse.text();
      console.log(`[ebilling] USSD push HTTP ${ussdResponse.status}, raw: ${rawUssdText.substring(0, 500)}`);

      try {
        ussdData = JSON.parse(rawUssdText);
      } catch {
        ussdData = { raw: rawUssdText.substring(0, 300) };
      }

      ussdSuccess = ussdResponse.ok && (ussdData?.message === "Accepted" || ussdData?.success);
    } catch (ussdErr) {
      console.error("[ebilling] USSD push error:", ussdErr);
      ussdData = { error: (ussdErr as Error).message };
    }

    // Record pending transaction with bill_id in metadata
    const { error: txError } = await supabaseAdmin.from("payment_transactions").insert({
      user_id: user.id,
      memorial_id,
      amount: totalAmount,
      currency: "XOF",
      payment_type: item_type,
      status: "pending",
      ebilling_reference: ebillingRef,
      ebilling_transaction_id: billId,
      payer_phone: phone,
      deceased_name_snapshot: resolvedDeceasedName,
      candle_count: candle_count ?? (item_type === "cierge" ? quantity : 0),
      flower_count: flower_count ?? (item_type === "fleur" ? quantity : 0),
      last_api_response: JSON.stringify({ bill: billData, ussd: ussdData }),
      metadata: {
        mode: "payant",
        quantity,
        unit_price: unitPrice,
        phone,
        post_id: post_id || null,
        bill_id: billId,
        payment_system: paymentSystemName,
        ussd_push_sent: ussdSuccess,
      },
    });

    if (txError) {
      console.error("[ebilling] Transaction insert error:", txError);
      throw txError;
    }

    // Build fallback checkout URL (portal redirect) in case USSD push fails
    const checkoutUrl = `${portalBaseUrl}?invoice=${billId}&redirect_url=${encodeURIComponent(paymentSuccessUrl)}`;

    return new Response(
      JSON.stringify({
        success: true,
        mode: "payant",
        reference: ebillingRef,
        amount: totalAmount,
        unit_price: unitPrice,
        requires_phone: true,
        bill_id: billId,
        ussd_push_sent: ussdSuccess,
        payment_system: paymentSystemName,
        checkout_url: checkoutUrl,
        ebilling_response: billData,
        message: ussdSuccess
          ? `Push USSD envoyé sur votre ${paymentSystemName === "airtelmoney" ? "Airtel Money" : "Moov Money"}. Tapez votre code secret pour confirmer.`
          : `Facture créée. Finalisez votre paiement via le portail eBilling.`,
      }),
      { status: 200, headers: jsonHeaders }
    );

  } catch (error: any) {
    console.error("[ebilling] UNHANDLED ERROR:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      { status: 500, headers: jsonHeaders }
    );
  }
};

serve(handler);
