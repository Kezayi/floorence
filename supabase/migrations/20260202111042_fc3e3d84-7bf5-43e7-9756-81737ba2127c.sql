-- Fix 1: Block anonymous access to payment_transactions
CREATE POLICY "Block anonymous access to payment transactions"
ON public.payment_transactions
FOR SELECT
TO anon
USING (false);

-- Fix 2: Verify guestbook_posts has proper anonymous blocking
-- The policy "Anon cannot directly access guestbook posts" should already exist
-- But let's make sure it's properly set up
DROP POLICY IF EXISTS "Anon cannot directly access guestbook posts" ON public.guestbook_posts;
CREATE POLICY "Anon cannot directly access guestbook posts"
ON public.guestbook_posts
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Fix 3: Restrict UPDATE policy on payment_transactions to prevent fraud
-- Users should NOT be able to update critical fields
DROP POLICY IF EXISTS "Users can update their own pending transactions" ON public.payment_transactions;

-- Only the webhook (service role) should update transactions
-- Users have no legitimate reason to update their transactions
-- So we remove user UPDATE capability entirely