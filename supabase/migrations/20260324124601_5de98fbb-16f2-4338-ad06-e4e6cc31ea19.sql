-- Fix "undefined undefined" deceased_name_snapshot by looking up the real name
UPDATE public.payment_transactions pt
SET deceased_name_snapshot = m.first_name || ' ' || m.last_name
FROM public.memorials m
WHERE pt.memorial_id = m.id
  AND (pt.deceased_name_snapshot = 'undefined undefined' OR pt.deceased_name_snapshot IS NULL);

-- Mark all timeout transactions older than 24h as failed (stop useless reconciliation)
UPDATE public.payment_transactions
SET status = 'failed', updated_at = now()
WHERE status = 'timeout'
  AND created_at < now() - interval '24 hours';