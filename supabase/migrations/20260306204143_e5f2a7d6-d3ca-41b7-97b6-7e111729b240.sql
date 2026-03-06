
-- Fix: Replace RESTRICTIVE policies with PERMISSIVE ones on global_settings

-- Drop the broken restrictive policies
DROP POLICY IF EXISTS "Admins can modify global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Anyone can read global settings" ON public.global_settings;

-- Recreate as PERMISSIVE
CREATE POLICY "Anyone can read global settings"
ON public.global_settings
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Admins can modify global settings"
ON public.global_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
