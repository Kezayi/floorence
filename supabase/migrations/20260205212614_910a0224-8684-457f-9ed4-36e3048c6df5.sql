-- =====================================================
-- FIX 1: Convert guestbook_posts admin SELECT policy from RESTRICTIVE to PERMISSIVE
-- Problem: All policies are RESTRICTIVE, so admin policy AND user policy must BOTH pass
-- Solution: Drop restrictive policy and recreate as permissive
-- =====================================================

-- Drop the existing restrictive admin SELECT policy
DROP POLICY IF EXISTS "Admins can view all guestbook posts" ON public.guestbook_posts;

-- Create PERMISSIVE admin SELECT policy (this will grant access even if other restrictive policies fail)
CREATE POLICY "Admins can view all guestbook posts"
ON public.guestbook_posts FOR SELECT
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

-- =====================================================
-- FIX 2: Create a secure view for public profile data
-- Problem: "Anyone can view display names" policy exposes ALL columns including phone
-- Solution: Create a view with only safe columns, then restrict direct table access
-- =====================================================

-- Create a public-safe view with ONLY non-sensitive columns
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT 
  user_id,
  display_name,
  avatar_url
FROM public.profiles;

-- Drop the dangerous "Anyone can view display names" policy that exposes phone numbers
DROP POLICY IF EXISTS "Anyone can view display names" ON public.profiles;

-- Grant SELECT on the view to authenticated and anon
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;

-- =====================================================
-- Add index for better performance on profiles_public view
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);