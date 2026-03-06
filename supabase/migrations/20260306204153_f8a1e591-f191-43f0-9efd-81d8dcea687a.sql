
-- Fix ritual_prices: same RESTRICTIVE bug
DROP POLICY IF EXISTS "Admins can manage ritual prices" ON public.ritual_prices;
DROP POLICY IF EXISTS "Anyone can view ritual prices" ON public.ritual_prices;

CREATE POLICY "Anyone can view ritual prices"
ON public.ritual_prices
FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Admins can manage ritual prices"
ON public.ritual_prices
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
