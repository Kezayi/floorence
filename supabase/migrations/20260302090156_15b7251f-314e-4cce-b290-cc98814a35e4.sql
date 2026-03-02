
ALTER TABLE public.guestbook_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates" ON public.guestbook_templates
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all templates" ON public.guestbook_templates
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
