ALTER TABLE public.memorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guestbook_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorial_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.ai_usage_logs TO service_role;
REVOKE ALL ON public.ai_usage_logs FROM anon;
DROP POLICY IF EXISTS "Admins can view AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Admins can view AI usage logs"
ON public.ai_usage_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
GRANT SELECT ON public.ai_usage_logs TO authenticated;