
-- =====================================================
-- FIX: profiles table public exposure (phone leak)
-- Strategy: Remove overly permissive SELECT policies,
-- keep owner-only + admin access on base table.
-- Public access goes through profiles_public view.
-- =====================================================

-- Drop the broken/redundant SELECT policies
DROP POLICY IF EXISTS "Les utilisateurs voient les noms, mais pas les contacts" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Recreate proper SELECT policies
-- 1. Owner can see their own full profile (including phone)
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
