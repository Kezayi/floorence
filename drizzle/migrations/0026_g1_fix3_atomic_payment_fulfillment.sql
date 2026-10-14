-- G1-FIX3: single transactional fulfillment of a confirmed eBilling payment.
-- Reversible: DROP FUNCTION public.fulfill_payment_success(uuid, text, text, text);
CREATE OR REPLACE FUNCTION public.fulfill_payment_success(
  p_tx_id uuid,
  p_reference text,
  p_ebilling_transaction_id text DEFAULT NULL,
  p_last_api_response text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.payment_transactions%ROWTYPE;
  v_unhidden uuid[];
  v_post_id uuid;
  v_qty integer;
  v_column text;
  v_credited jsonb := NULL;
  v_rows integer;
BEGIN
  -- Server-only: refuse any end-user JWT even if a grant is ever re-added.
  IF coalesce(auth.role(), '') IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_tx FROM public.payment_transactions WHERE id = p_tx_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_found');
  END IF;
  IF v_tx.ebilling_reference IS DISTINCT FROM p_reference THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'reference_mismatch');
  END IF;
  IF v_tx.status = 'success' THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_processed');
  END IF;
  IF v_tx.status NOT IN ('pending', 'timeout', 'failed') THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'not_eligible');
  END IF;

  UPDATE public.payment_transactions
     SET status = 'success',
         updated_at = now(),
         last_sync_at = now(),
         ebilling_transaction_id = coalesce(p_ebilling_transaction_id, ebilling_transaction_id),
         last_api_response = coalesce(p_last_api_response, last_api_response)
   WHERE id = p_tx_id;

  -- Paid hidden tribute: unhide only (its initial gestures were recorded at creation).
  WITH u AS (
    UPDATE public.guestbook_posts
       SET is_hidden = false, updated_at = now()
     WHERE payment_reference = p_reference AND is_hidden = true AND deleted_at IS NULL
    RETURNING id
  ) SELECT coalesce(array_agg(id), '{}') INTO v_unhidden FROM u;

  -- Gesture on an existing tribute: atomic SQL addition.
  IF (v_tx.metadata ? 'post_id') AND (v_tx.metadata->>'post_id') ~* '^[0-9a-f-]{36}$' THEN
    v_post_id := (v_tx.metadata->>'post_id')::uuid;
    v_qty := CASE WHEN (v_tx.metadata->>'quantity') ~ '^[0-9]+$' AND (v_tx.metadata->>'quantity')::int > 0
                  THEN (v_tx.metadata->>'quantity')::int ELSE 1 END;
    IF NOT (v_post_id = ANY (v_unhidden)) THEN
      v_column := CASE WHEN v_tx.payment_type = 'cierge' THEN 'candle_count' ELSE 'flower_count' END;
      IF v_column = 'candle_count' THEN
        UPDATE public.guestbook_posts SET candle_count = candle_count + v_qty, updated_at = now()
         WHERE id = v_post_id AND deleted_at IS NULL AND payment_reference IS DISTINCT FROM p_reference;
      ELSE
        UPDATE public.guestbook_posts SET flower_count = flower_count + v_qty, updated_at = now()
         WHERE id = v_post_id AND deleted_at IS NULL AND payment_reference IS DISTINCT FROM p_reference;
      END IF;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      IF v_rows = 1 THEN
        v_credited := jsonb_build_object('postId', v_post_id, 'column', v_column, 'quantity', v_qty);
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('claimed', true, 'unhidden', cardinality(v_unhidden),
                            'unhidden_ids', to_jsonb(v_unhidden), 'credited', v_credited);
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_payment_success(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_payment_success(uuid, text, text, text) TO service_role;