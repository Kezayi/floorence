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

export async function finalizePaymentSuccess(admin: Admin, input: FinalizeInput): Promise<FinalizeResult> {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: "success", updated_at: now, last_sync_at: now };
  if (input.ebillingTransactionId) patch.ebilling_transaction_id = input.ebillingTransactionId;
  if (input.lastApiResponse) patch.last_api_response = input.lastApiResponse;

  // 1. Atomic claim
  const { data: claimedRows, error: claimErr } = await admin
    .from("payment_transactions")
    .update(patch)
    .eq("id", input.txId)
    .neq("status", "success")
    .select("id, payment_type, metadata");
  if (claimErr) throw claimErr;
  if (!claimedRows || claimedRows.length === 0) {
    console.log(`[payment-success:${input.channel}] ref=${input.reference} already processed`);
    return { claimed: false, unhidden: 0, credited: null };
  }
  const tx = claimedRows[0];

  // 2. Unhide the paid tribute linked to this reference (if any)
  const { data: unhiddenRows } = await admin
    .from("guestbook_posts")
    .update({ is_hidden: false, updated_at: now })
    .eq("payment_reference", input.reference)
    .eq("is_hidden", true)
    .select("id");
  const unhiddenIds: string[] = (unhiddenRows ?? []).map((r: { id: string }) => r.id);

  // 3. Credit a gesture on an existing tribute (not the linked paid tribute)
  let credited: FinalizeResult["credited"] = null;
  const meta = (tx.metadata ?? {}) as Record<string, unknown>;
  const postId = typeof meta.post_id === "string" ? meta.post_id : null;
  const quantity = Number(meta.quantity) > 0 ? Number(meta.quantity) : 1;
  if (postId) {
    const { data: post } = await admin
      .from("guestbook_posts")
      .select("id, payment_reference, candle_count, flower_count, deleted_at")
      .eq("id", postId)
      .maybeSingle();
    const isLinkedTribute = post && (post.payment_reference === input.reference || unhiddenIds.includes(post.id));
    if (post && !post.deleted_at && !isLinkedTribute) {
      const column = tx.payment_type === "cierge" ? "candle_count" : "flower_count";
      const current = Number(post[column] ?? 0);
      await admin.from("guestbook_posts").update({ [column]: current + quantity }).eq("id", postId);
      credited = { postId, column, quantity };
    }
  }

  console.log(`[payment-success:${input.channel}] ref=${input.reference} claimed, unhidden=${unhiddenIds.length}, credited=${JSON.stringify(credited)}`);

  // 4. Certificate / receipt — winner only, non-blocking
  if (!input.skipCertificate) {
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

  return { claimed: true, unhidden: unhiddenIds.length, credited };
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
