-- Create certificates storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Only admins can read certificates
CREATE POLICY "Admins can read certificates"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificates'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- RLS: Service role can insert certificates (edge functions use service role)
CREATE POLICY "Service role can insert certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'certificates');