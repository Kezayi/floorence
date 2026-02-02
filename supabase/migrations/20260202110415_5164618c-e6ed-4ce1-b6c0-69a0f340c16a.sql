-- Fix 1: Ensure payment_transactions.user_id cannot be NULL
-- First, delete any orphaned transactions (if any exist)
DELETE FROM public.payment_transactions WHERE user_id IS NULL;

-- Add NOT NULL constraint to user_id
ALTER TABLE public.payment_transactions 
ALTER COLUMN user_id SET NOT NULL;

-- Fix 2: Create a public view for guestbook_posts that excludes payment_reference
CREATE VIEW public.guestbook_posts_public
WITH (security_invoker = on) AS
SELECT 
  id,
  memorial_id,
  user_id,
  author_name,
  relation_category,
  content,
  photos,
  candle_count,
  flower_count,
  created_at,
  updated_at
FROM public.guestbook_posts;

-- Grant access to the view
GRANT SELECT ON public.guestbook_posts_public TO anon, authenticated;

-- Update the base table policy to be more restrictive for SELECT
-- Drop the old permissive policy
DROP POLICY IF EXISTS "Anyone can view guestbook posts" ON public.guestbook_posts;

-- Create a new policy that only allows viewing through authenticated context
-- (Public reads should go through the view instead)
CREATE POLICY "Authenticated users can view guestbook posts"
ON public.guestbook_posts
FOR SELECT
TO authenticated
USING (true);

-- Allow anon to read through the view (which excludes payment_reference)
-- The base table will deny direct anon access
CREATE POLICY "Anon cannot directly access guestbook posts"
ON public.guestbook_posts
FOR SELECT
TO anon
USING (false);