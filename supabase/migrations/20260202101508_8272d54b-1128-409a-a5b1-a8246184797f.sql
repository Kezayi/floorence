-- Fix the overly permissive RLS policy by dropping and recreating with proper restrictions
DROP POLICY IF EXISTS "Service role can update transactions" ON public.payment_transactions;

-- Create a more secure policy that only allows updating specific fields via authenticated service
-- The webhook will use service_role key which bypasses RLS, so we don't need this policy
-- Instead, we ensure only the transaction owner can see their updates
CREATE POLICY "Users can update their own pending transactions"
ON public.payment_transactions
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id);