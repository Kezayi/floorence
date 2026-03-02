
CREATE OR REPLACE FUNCTION public.increment_template_usage(p_template_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.guestbook_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;
$$;
