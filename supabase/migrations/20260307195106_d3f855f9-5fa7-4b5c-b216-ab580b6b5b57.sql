
-- View: pending transactions needing reconciliation (pending/timeout, older than 2 min)
CREATE OR REPLACE VIEW public.v_pending_reconciliation
WITH (security_invoker = true)
AS
SELECT
  pt.id,
  pt.ebilling_reference,
  pt.status,
  pt.memorial_id,
  pt.created_at,
  pt.payer_phone,
  pt.deceased_name_snapshot,
  pt.amount
FROM public.payment_transactions pt
WHERE pt.status IN ('pending', 'timeout')
  AND pt.ebilling_reference IS NOT NULL
  AND pt.created_at < now() - interval '2 minutes'
ORDER BY pt.created_at ASC
LIMIT 10;

-- Table: system_logs for worker audit trail
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read system logs
CREATE POLICY "Admins can view system logs"
  ON public.system_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only service role can insert (via edge functions)
CREATE POLICY "Service role can insert system logs"
  ON public.system_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
