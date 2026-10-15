-- G1-FIX7: paid memorial publication.
-- Rollback: DROP TRIGGER trg_guard_memorial_publication ON public.memorials;
--           DROP FUNCTION public.guard_memorial_publication();
--           re-apply fulfill_payment_success from the G1-FIX3 migration (0026).

-- 1) Publication guard: end users (anon/authenticated) can never switch a memorial to published.
--    Only server operations (service_role / postgres) or an admin back-office account may.
CREATE OR REPLACE FUNCTION public.guard_memorial_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_published IS TRUE
     AND (TG_OP = 'INSERT' OR OLD.is_published IS DISTINCT FROM TRUE)
     AND coalesce(auth.role(), '') IN ('anon', 'authenticated')
     AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'publication_forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_memorial_publication() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_memorial_publication ON public.memorials;
CREATE TRIGGER trg_guard_memorial_publication
BEFORE INSERT OR UPDATE OF is_published ON public.memorials
FOR EACH ROW EXECUTE FUNCTION public.guard_memorial_publication();

-- 2) Fulfillment extended to payment_type = 'memorial' (same transaction, full rollback).
CREATE OR REPLACE FUNCTION public.fulfill_payment_success(p_tx_id uuid, p_reference text, p_ebilling_transaction_id text DEFAULT NULL::text, p_last_api_response text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tx public.payment_transactions%ROWTYPE;
  v_unhidden uuid[];
  v_post_id uuid;
  v_qty integer;
  v_column text;
  v_credited jsonb := NULL;
  v_rows integer;
  v_published uuid := NULL;
BEGIN
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

  -- G1-FIX7: memorial publication — only the memorial bound to this transaction.
  IF v_tx.payment_type = 'memorial' THEN
    IF v_tx.memorial_id IS NULL
       OR (v_tx.metadata->>'memorial_id') IS DISTINCT FROM v_tx.memorial_id::text THEN
      RAISE EXCEPTION 'memorial_binding_invalid' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.memorials
       SET is_published = true, updated_at = now()
     WHERE id = v_tx.memorial_id AND deleted_at IS NULL AND created_by = v_tx.user_id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN
      RAISE EXCEPTION 'memorial_publication_failed' USING ERRCODE = 'P0001';
    END IF;
    v_published := v_tx.memorial_id;
    RETURN jsonb_build_object('claimed', true, 'unhidden', 0, 'unhidden_ids', '[]'::jsonb,
                              'credited', NULL, 'published_memorial_id', v_published);
  END IF;

  WITH u AS (
    UPDATE public.guestbook_posts
       SET is_hidden = false, updated_at = now()
     WHERE payment_reference = p_reference AND is_hidden = true AND deleted_at IS NULL
    RETURNING id
  ) SELECT coalesce(array_agg(id), '{}') INTO v_unhidden FROM u;

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
$function$;

REVOKE EXECUTE ON FUNCTION public.fulfill_payment_success(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_payment_success(uuid, text, text, text) TO service_role;