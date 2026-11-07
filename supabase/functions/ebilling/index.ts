import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { finalizePaymentSuccess, markPaymentFailed } from "../_shared/paymentSuccess.ts";
import { classifyMemorial, readMemorialPrice } from "../_shared/memorialPricing.ts";
import { isPromoActive, PROMO_SETTING_KEY } from "../_shared/obituaryPromo.ts";
import { checkGestureOrder } from "../_shared/gestureRules.ts";
import { getPvitConfig, normalizeMsisdn, detectOperator, newReference, initiatePayment, checkPvitStatus } from "../_shared/pvit.ts";

// PAY-PVIT: this function keeps its historical name "ebilling" as the stable client contract,
// but the only operator behind it is now PVit v2 (production). eBilling is fully removed.
// Columns ebilling_reference / ebilling_transaction_id hold the Floorence reference / PVit transaction id.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { "Content-Type": "application/json", ...corsHeaders };

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

// ── CHECK-STATUS: local state first, then PVit status API (no debit) ──
async function handleCheckStatus(body: any, supabaseAdmin: any): Promise<Response> {
  const { reference } = body;
  if (!reference) {
    return new Response(JSON.stringify({ error: "Référence manquante" }), { status: 400, headers: jsonHeaders });
  }
  const { data: tx } = await supabaseAdmin
    .from("payment_transactions")
    .select("id, status, amount, metadata, ebilling_transaction_id")
    .eq("ebilling_reference", reference)
    .maybeSingle();
  if (!tx) return new Response(JSON.stringify({ error: "Transaction introuvable" }), { status: 404, headers: jsonHeaders });
  if (tx.status === "success") {
    return new Response(JSON.stringify({ success: true, already_confirmed: true, status: "success" }), { status: 200, headers: jsonHeaders });
  }
  if (tx.status === "failed") {
    return new Response(JSON.stringify({ success: false, status: "failed", message: "Cette transaction a échoué définitivement" }), { status: 200, headers: jsonHeaders });
  }
  const meta = (tx.metadata ?? {}) as Record<string, any>;
  const pvitId = meta.pvit_transaction_id || tx.ebilling_transaction_id;
  const st = await checkPvitStatus(getPvitConfig(), pvitId, meta.pvit_account);
  if (st) {
    await supabaseAdmin.from("payment_transactions")
      .update({ last_api_response: st.raw, last_sync_at: new Date().toISOString() }).eq("id", tx.id);
    if (st.state === "success" && (Number.isNaN(st.amount) || st.amount === null || st.amount >= tx.amount)) {
      const r = await finalizePaymentSuccess(supabaseAdmin, { txId: tx.id, reference, channel: "check-status", ebillingTransactionId: pvitId });
      return new Response(JSON.stringify({ success: true, status: "success", already_confirmed: !r.claimed, message: "Paiement confirmé" }), { status: 200, headers: jsonHeaders });
    }
    if (st.state === "failed") {
      await markPaymentFailed(supabaseAdmin, tx.id);
      return new Response(JSON.stringify({ success: false, status: "failed", payment_status: "FAILED", message: "Paiement refusé ou annulé. Veuillez réessayer." }), { status: 200, headers: jsonHeaders });
    }
  }
  return new Response(JSON.stringify({
    success: false, status: tx.status, payment_status: "PENDING",
    message: "Paiement en attente. Tapez votre code secret sur votre téléphone.",
  }), { status: 200, headers: jsonHeaders });
}

// ── G1-FIX9: stale memorial payment resolution ──
//  - pending > 30 min without PVit id → never reached the operator → local closure, retry allowed.
//  - with PVit id → ask PVit (GET, no debit): success → fulfillment; failed → failed;
//    unknown → timeout, retry stays BLOCKED (avoid double debit).
export const STALE_MS = 30 * 60 * 1000;

export function isBlockingMemorialTx(t: { status: string; metadata?: any }): boolean {
  if (t.status === "success" || t.status === "pending") return true;
  if (t.status === "timeout") return t.metadata?.local_closure !== "no_operator_bill";
  return false;
}

async function resolveStaleMemorialPayments(supabaseAdmin: any, memorialId: string) {
  const cutoff = new Date(Date.now() - STALE_MS).toISOString();
  const { data: stale } = await supabaseAdmin
    .from("payment_transactions")
    .select("id, status, ebilling_reference, metadata, ebilling_transaction_id")
    .eq("memorial_id", memorialId)
    .eq("payment_type", "memorial")
    .in("status", ["pending", "timeout"])
    .lt("created_at", cutoff);
  for (const tx of stale ?? []) {
    const meta = (tx.metadata ?? {}) as Record<string, any>;
    if (meta.local_closure === "no_operator_bill") continue;
    const pvitId = meta.pvit_transaction_id || tx.ebilling_transaction_id;
    const now = new Date().toISOString();
    if (!pvitId) {
      await supabaseAdmin.from("payment_transactions")
        .update({ status: "timeout", updated_at: now, metadata: { ...meta, local_closure: "no_operator_bill", local_closed_at: now } })
        .eq("id", tx.id).in("status", ["pending", "timeout"]);
      continue;
    }
    const st = await checkPvitStatus(getPvitConfig(), pvitId, meta.pvit_account);
    const state = st?.state ?? "";
    if (state === "success") {
      await finalizePaymentSuccess(supabaseAdmin, { txId: tx.id, reference: tx.ebilling_reference, channel: "reconciliation", ebillingTransactionId: pvitId });
    } else if (state === "failed") {
      await markPaymentFailed(supabaseAdmin, tx.id);
    } else if (tx.status === "pending") {
      await supabaseAdmin.from("payment_transactions")
        .update({ status: "timeout", updated_at: now, metadata: { ...meta, operator_status: state || "unknown", operator_checked_at: now } })
        .eq("id", tx.id).eq("status", "pending");
    }
  }
}

// ── MAIN HANDLER ──
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const pvit = getPvitConfig();
    if (!pvit.ok) {
      console.error(`[pvit] FATAL: configuration incomplète (${pvit.missing.join(", ")})`);
      return new Response(JSON.stringify({ error: "Configuration de paiement incomplète" }), { status: 500, headers: jsonHeaders });
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
    
    // ── ROUTE: check-status ──
    if (body.action === "check-status") {
      // G1-FIX8: only the transaction owner (or an admin) may query/advance a transaction.
      if (body.reference) {
        const { data: ownTx } = await supabaseAdmin
          .from("payment_transactions").select("user_id").eq("ebilling_reference", body.reference).maybeSingle();
        if (ownTx && ownTx.user_id !== user.id) {
          const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
          if (!isAdmin) {
            return new Response(JSON.stringify({ error: "Transaction introuvable" }), { status: 404, headers: jsonHeaders });
          }
        }
      }
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
          }

    // Server-side truth: check monetization mode
    const { data: monetizationSetting } = await supabaseAdmin
      .from("global_settings")
      .select("value_bool")
      .eq("key", "is_monetized")
      .single();

    const isMonetized = monetizationSetting?.value_bool ?? false;

    // ── G1-FIX7: memorial publication payment (price recomputed server-side) ──
    const isMemorialPayment = item_type === "memorial";
    let memorialPrice: number | null = null;
    let memorialCategory: string | null = null;
    if (isMemorialPayment) {
      if (quantity !== 1 || post_id) {
        return new Response(JSON.stringify({ error: "Paramètres invalides" }), { status: 400, headers: jsonHeaders });
      }
      const { data: mem } = await supabaseAdmin
        .from("memorials")
        .select("id, created_by, is_published, deleted_at, death_date, funeral_date")
        .eq("id", memorial_id)
        .maybeSingle();
      if (!mem || mem.deleted_at) {
        return new Response(JSON.stringify({ error: "Mémorial introuvable" }), { status: 404, headers: jsonHeaders });
      }
      if (mem.created_by !== user.id) {
        return new Response(JSON.stringify({ error: "Mémorial non autorisé" }), { status: 403, headers: jsonHeaders });
      }
      if (mem.is_published) {
        return new Response(JSON.stringify({ error: "Mémorial déjà publié" }), { status: 409, headers: jsonHeaders });
      }
      const cls = classifyMemorial(mem.death_date, mem.funeral_date);
      if (!cls.ok) {
        return new Response(JSON.stringify({ error: cls.error }), { status: 400, headers: jsonHeaders });
      }
      memorialCategory = cls.category;
      memorialPrice = await readMemorialPrice(supabaseAdmin, cls.category);
      if (memorialPrice === null) {
        return new Response(JSON.stringify({ error: "Tarif indisponible, réessayez plus tard" }), { status: 503, headers: jsonHeaders });
      }
      // PROMO-01-FIX1: the global switch no longer makes obituaries free; only price 0 or an active campaign does.
      let promoActiveNow = false;
      if (cls.category === "future" && memorialPrice > 0) {
        const { data: promoRow } = await supabaseAdmin.from("system_settings").select("value").eq("key", PROMO_SETTING_KEY).maybeSingle();
        promoActiveNow = isPromoActive(promoRow?.value ?? null);
      }
      // MON-02: free mode waives memorial publication only (never candles/flowers).
      if (memorialPrice === 0 || promoActiveNow || !isMonetized) {
        return new Response(JSON.stringify({ error: "Aucun paiement requis pour ce mémorial" }), { status: 409, headers: jsonHeaders });
      }
      // G1-FIX9: resolve stale attempts (>30 min) before deciding; never invent an operator status.
      await resolveStaleMemorialPayments(supabaseAdmin, memorial_id);
      const { data: openTxs } = await supabaseAdmin
        .from("payment_transactions")
        .select("id, status, metadata")
        .eq("memorial_id", memorial_id)
        .eq("payment_type", "memorial")
        .in("status", ["pending", "success", "timeout"]);
      const blocking = (openTxs ?? []).filter((t: any) => isBlockingMemorialTx(t));
      if (blocking.length > 0) {
        const s = blocking.some((t: any) => t.status === "success") ? "success"
          : blocking.some((t: any) => t.status === "pending") ? "pending" : "timeout";
        const error = s === "success" ? "Ce mémorial a déjà été payé"
          : s === "pending" ? "Un paiement est déjà en cours pour ce mémorial"
          : "Le paiement précédent est en cours de vérification auprès de l'opérateur. Nouvelle tentative impossible pour éviter un double débit.";
        return new Response(JSON.stringify({ error, reference_status: s }), { status: 409, headers: jsonHeaders });
      }
    } else if (item_type !== "cierge" && item_type !== "fleur") {
      return new Response(JSON.stringify({ error: "Paramètres invalides" }), { status: 400, headers: jsonHeaders });
    }

    let unitPrice: number | undefined;
    if (isMemorialPayment) {
      unitPrice = memorialPrice ?? undefined;
    } else {
      const { data: priceData } = await supabaseAdmin
        .from("ritual_prices")
        .select("unit_price")
        .eq("item_type", item_type)
        .single();
      unitPrice = priceData?.unit_price;
    }

    // G1-FIX6: active price only, never a hardcoded fallback.
    if (typeof unitPrice !== "number" || unitPrice < 0) {
      return new Response(
        JSON.stringify({ error: "Tarif indisponible, réessayez plus tard" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const totalAmount = unitPrice * quantity;
    const ebillingRef = newReference();
    const itemLabel = isMemorialPayment ? "Publication mémorial" : item_type === "cierge" ? "Cierge" : "Fleur";
    const memorialMeta = isMemorialPayment ? { memorial_id, memorial_category: memorialCategory } : {};

    console.log(`[pvit] mode=${isMonetized ? "payant" : "gratuit"}, item=${item_type}, qty=${quantity}, price=${unitPrice}`);

    // PROMO-01-FIX1: no free branch — candles, flowers and obituaries are always billed at their active price.

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

    // ── G1-FIX1: validate post_id server-side before any operator call ──
    // Hidden post = paid tribute awaiting payment → must belong to caller, same memorial, unlinked.
    // Visible post = symbolic gesture on an existing tribute → no reference link (unchanged behaviour).
    let tributeLink: string | null = null;
    if (post_id) {
      const { data: post, error: postErr } = await supabaseAdmin
        .from("guestbook_posts")
        .select("id, memorial_id, user_id, is_hidden, payment_reference, deleted_at, candle_count, flower_count")
        .eq("id", post_id)
        .maybeSingle();
      if (postErr || !post || post.deleted_at) {
        return new Response(JSON.stringify({ error: "Hommage introuvable" }), { status: 404, headers: jsonHeaders });
      }
      if (post.memorial_id !== memorial_id) {
        return new Response(JSON.stringify({ error: "Hommage non rattaché à ce mémorial" }), { status: 400, headers: jsonHeaders });
      }
      if (post.is_hidden) {
        if (post.user_id !== user.id) {
          return new Response(JSON.stringify({ error: "Hommage non autorisé" }), { status: 403, headers: jsonHeaders });
        }
        if (post.payment_reference) {
          return new Response(JSON.stringify({ error: "Hommage déjà associé à une transaction" }), { status: 409, headers: jsonHeaders });
        }
        tributeLink = post.id;
      }
    }

    // ── GEST-01: gestures always paid, bound to a tribute, within the server quota ──
    if (!isMemorialPayment) {
      if (!post_id) {
        return new Response(JSON.stringify({ error: "Hommage requis pour un geste" }), { status: 400, headers: jsonHeaders });
      }
      if (!(typeof unitPrice === "number" && unitPrice > 0)) {
        return new Response(JSON.stringify({ error: "Tarif indisponible, réessayez plus tard" }), { status: 503, headers: jsonHeaders });
      }
      const { data: gPost } = await supabaseAdmin.from("guestbook_posts")
        .select("is_hidden, candle_count, flower_count").eq("id", post_id).maybeSingle();
      const { data: inFlightTxs } = await supabaseAdmin.from("payment_transactions")
        .select("metadata").in("payment_type", ["cierge", "fleur"]).in("status", ["pending", "timeout"])
        .eq("metadata->>post_id", post_id);
      if ((inFlightTxs ?? []).length > 0) {
        return new Response(JSON.stringify({ error: "Un paiement de geste est déjà en cours pour cet hommage" }), { status: 409, headers: jsonHeaders });
      }
      const c = gPost?.candle_count ?? 0, f = gPost?.flower_count ?? 0;
      // GESTURES-UNLIMITED: no business quantity limit; only the operator ceiling per payment.
      const check = tributeLink && !(item_type === "cierge" ? c === quantity && f === 0 : f === quantity && c === 0)
        ? { ok: false as const, error: "Gestes non conformes à l'hommage" }
        : checkGestureOrder(quantity, unitPrice);
      if (!check.ok) {
        return new Response(JSON.stringify({ error: check.error }), { status: 409, headers: jsonHeaders });
      }
    }
    // ── PVit: normalize number + route operator ──
    const msisdn = normalizeMsisdn(String(phone));
    const operator = msisdn ? detectOperator(msisdn) : null;
    if (!msisdn || !operator) {
      return new Response(JSON.stringify({ error: "Numéro Airtel Money (07…) ou Moov Money (06…) invalide" }), { status: 400, headers: jsonHeaders });
    }

    const product = `${itemLabel} x${quantity}${resolvedDeceasedName ? " - " + resolvedDeceasedName : ""}`;
    const push = await initiatePayment(pvit, { amount: totalAmount, reference: ebillingRef, msisdn, operator, product });
    const baseRow = {
      user_id: user.id,
      memorial_id,
      amount: totalAmount,
      currency: "XAF",
      payment_type: item_type,
      ebilling_reference: ebillingRef,
      payer_phone: msisdn,
      deceased_name_snapshot: resolvedDeceasedName,
      candle_count: item_type === "cierge" ? quantity : 0,
      flower_count: item_type === "fleur" ? quantity : 0,
      last_api_response: push.raw,
    };
    const baseMeta = { ...memorialMeta, gateway: "pvit", mode: "payant", quantity, unit_price: unitPrice, phone: msisdn, post_id: post_id || null, operator, pvit_account: push.account };

    if (!push.accepted || !push.transactionId) {
      console.error(`[pvit] push refused ref=${ebillingRef} HTTP ${push.httpStatus}`);
      await supabaseAdmin.from("payment_transactions").insert({ ...baseRow, status: "failed", metadata: { ...baseMeta, error: push.data?.message || `http_${push.httpStatus}` } });
      return new Response(JSON.stringify({ error: push.data?.message || "L'opérateur n'a pas accepté la demande de paiement. Réessayez." }), { status: 502, headers: jsonHeaders });
    }

    const { error: txError } = await supabaseAdmin.from("payment_transactions").insert({
      ...baseRow,
      status: "pending",
      ebilling_transaction_id: push.transactionId,
      metadata: { ...baseMeta, pvit_transaction_id: push.transactionId, bill_id: push.transactionId, ussd_push_sent: true },
    });
    if (txError) {
      console.error("[pvit] Transaction insert error:", txError);
      throw txError;
    }

    // ── G1-FIX1: atomic link tribute ↔ payment reference (hidden tribute only) ──
    if (tributeLink) {
      const { data: linked, error: linkErr } = await supabaseAdmin
        .from("guestbook_posts")
        .update({ payment_reference: ebillingRef })
        .eq("id", tributeLink)
        .eq("memorial_id", memorial_id)
        .eq("user_id", user.id)
        .eq("is_hidden", true)
        .is("payment_reference", null)
        .select("id");
      if (linkErr || !linked || linked.length === 0) {
        console.error("[pvit] Tribute link failed (race or invalid):", linkErr);
        await supabaseAdmin.from("payment_transactions")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("ebilling_reference", ebillingRef);
        return new Response(JSON.stringify({ error: "Association hommage impossible (déjà associé ou invalide)" }), { status: 409, headers: jsonHeaders });
      }
    }

    const operatorName = operator === "MOOV_MONEY" ? "Moov Money" : "Airtel Money";
    return new Response(
      JSON.stringify({
        success: true,
        mode: "payant",
        reference: ebillingRef,
        amount: totalAmount,
        unit_price: unitPrice,
        requires_phone: true,
        ussd_push_sent: true,
        payment_system: operator,
        message: `Demande envoyée sur votre ${operatorName}. Tapez votre code secret pour confirmer.`,
      }),
      { status: 200, headers: jsonHeaders }
    );

  } catch (error: any) {
    console.error("[pvit] UNHANDLED ERROR:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      { status: 500, headers: jsonHeaders }
    );
  }
};

serve(handler);
