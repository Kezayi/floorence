CREATE OR REPLACE VIEW public.backoffice_finance_audit
WITH (security_invoker = true) AS
SELECT
  id,
  (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'WAT' AS date_libreville,
  amount,
  status,
  payer_phone,
  deceased_name_snapshot,
  ebilling_reference,
  last_api_response,
  user_id,
  payment_type,
  candle_count,
  flower_count,
  metadata->>'operator' AS operator
FROM public.payment_transactions t;