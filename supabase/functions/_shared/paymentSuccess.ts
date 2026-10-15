// G1-FIX2 — Single source of truth for a confirmed eBilling payment.
// Used by ebilling-callback, ebilling (check-status) and payment-reconciliation.
//
// Guarantees:
// 1. Atomic claim: only ONE caller can move a transaction to "success"
//    (conditional UPDATE ... WHERE status <> 'success' RETURNING id).
//    Losers of the race return { claimed: false } and do nothing else.
// 2. Paid hidden tribute (post.payment_reference === ref): unhidden only.
//    Its candle/flower counts were already written by publish-tribute → never re-credited.
// 3. Gesture on an existing visible tribute (metadata.post_id, not linked by ref):
//    the gesture count is incremented exactly once (guarded by the claim).
// 4. Certificate/receipt (process-payment-success) is triggered once, by the winner only,
//    and can be suppressed (skipCertificate) for isolated tests.

// deno-lint-ignore no-explicit-any
type Admin = any;

export interface FinalizeInput {
  txId: string;
  reference: string;
  channel: "callback" | "check-status" | "reconciliation";
  ebillingTransactionId?: string | null;
  lastApiResponse?: string | null;
  skipCertificate?: boolean;
}

export interface FinalizeResult {
  claimed: boolean;
  unhidden: number;
  credited: { postId: string; column: string; quantity: number } | null;
}

// G1-FIX3: claim + unhide + gesture credit run in ONE PostgreSQL transaction
// (public.fulfill_payment_success, service_role only, row lock FOR UPDATE, full rollback on error).
export async function finalizePaymentSuccess(admin: Admin, input: FinalizeInput): Promise<FinalizeResult> {
  const { data, error } = await admin.rpc("fulfill_payment_success", {
    p_tx_id: input.txId,
    p_reference: input.reference,
    p_ebilling_transaction_id: input.ebillingTransactionId ?? null,
    p_last_api_response: input.lastApiResponse ?? null,
  });
  if (error) throw error;
  const r = (data ?? {}) as { claimed?: boolean; reason?: string; unhidden?: number; credited?: FinalizeResult["credited"]; published_memorial_id?: string | null };
  if (!r.claimed) {
    console.log(`[payment-success:${input.channel}] ref=${input.reference} not claimed (${r.reason})`);
    return { claimed: false, unhidden: 0, credited: null };
  }
  const credited = r.credited ?? null;
  console.log(`[payment-success:${input.channel}] ref=${input.reference} claimed, unhidden=${r.unhidden ?? 0}, credited=${JSON.stringify(credited)}, published=${r.published_memorial_id ?? null}`);
  // Recovery note: if the certificate call below fails after commit, the transaction is
  // already 'success'; re-run process-payment-success with { transaction_id } (idempotent caller-side).

  // 4. Certificate / receipt — winner only, non-blocking (gesture/tribute payments only; G1-FIX7)
  if (!input.skipCertificate && !r.published_memorial_id) {
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/process-payment-success`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ transaction_id: input.txId }),
      });
    } catch (e) {
      console.error(`[payment-success:${input.channel}] certificate failed (non-blocking):`, e);
    }
  }

  return { claimed: true, unhidden: r.unhidden ?? 0, credited };
}

// Failure transition that can never overwrite a confirmed payment.
export async function markPaymentFailed(admin: Admin, txId: string, extra: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  await admin
    .from("payment_transactions")
    .update({ status: "failed", updated_at: now, last_sync_at: now, ...extra })
    .eq("id", txId)
    .neq("status", "success");
}
