ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS residence_country_code text;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_residence_country_code_iso CHECK (residence_country_code IS NULL OR residence_country_code ~ '^[A-Z]{2}$');
COMMENT ON COLUMN public.profiles.residence_country_code IS 'GEO-02: declared residence country (ISO alpha-2), private to owner/admin, never inferred';

ALTER TABLE public.guestbook_posts ADD COLUMN IF NOT EXISTS author_country_code text;
ALTER TABLE public.guestbook_posts ADD CONSTRAINT guestbook_posts_author_country_code_iso CHECK (author_country_code IS NULL OR author_country_code ~ '^[A-Z]{2}$');
COMMENT ON COLUMN public.guestbook_posts.author_country_code IS 'GEO-02: country snapshot at deposit, stored ONLY when author consented to public display; NULL = not shown';

CREATE OR REPLACE FUNCTION public.guard_tribute_country()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF NEW.author_country_code IS DISTINCT FROM OLD.author_country_code
     AND NEW.author_country_code IS NOT NULL THEN
    RAISE EXCEPTION 'author_country_code can only be withdrawn';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_guard_tribute_country BEFORE UPDATE OF author_country_code ON public.guestbook_posts
FOR EACH ROW EXECUTE FUNCTION public.guard_tribute_country();

CREATE OR REPLACE FUNCTION public.get_public_tribute_countries(p_post_ids uuid[])
RETURNS TABLE(id uuid, country_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.author_country_code FROM public.guestbook_posts g
  WHERE g.id = ANY(p_post_ids[1:200]) AND g.is_hidden = false AND g.deleted_at IS NULL
    AND g.author_country_code IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_public_tribute_countries(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_tribute_countries(uuid[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.withdraw_tribute_country(p_post_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (UPDATE public.guestbook_posts SET author_country_code = NULL
    WHERE id = p_post_id AND user_id = auth.uid() AND auth.uid() IS NOT NULL RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM u);
$$;
REVOKE ALL ON FUNCTION public.withdraw_tribute_country(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_tribute_country(uuid) TO authenticated;