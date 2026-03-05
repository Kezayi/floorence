-- Enable RLS on global_settings
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed by frontend)
CREATE POLICY "Anyone can read global settings"
ON public.global_settings
FOR SELECT
TO authenticated, anon
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can modify global settings"
ON public.global_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));