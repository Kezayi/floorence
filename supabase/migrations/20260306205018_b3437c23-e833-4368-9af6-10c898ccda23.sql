
-- Fix confirm_payment_and_publish to use lowercase status
CREATE OR REPLACE FUNCTION public.confirm_payment_and_publish(p_ebilling_ref text, p_transaction_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_memorial_id uuid;
BEGIN
    UPDATE public.payment_transactions 
    SET status = 'success', 
        ebilling_transaction_id = p_transaction_id,
        updated_at = NOW()
    WHERE ebilling_reference = p_ebilling_ref
    RETURNING memorial_id INTO v_memorial_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
    END IF;

    UPDATE public.guestbook_posts 
    SET is_hidden = false, updated_at = NOW()
    WHERE memorial_id = v_memorial_id
      AND payment_reference = p_ebilling_ref
      AND is_hidden = true;

    RETURN jsonb_build_object('success', true, 'memorial_id', v_memorial_id);
END;
$function$;
