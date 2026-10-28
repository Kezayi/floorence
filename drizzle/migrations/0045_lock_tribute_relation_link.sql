-- Canonical contributor<->deceased link: first explicit relation_link per (memorial_id, user_id), ordered by created_at, id.
CREATE TABLE IF NOT EXISTS public.guestbook_relation_link_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  memorial_id uuid NOT NULL,
  user_id uuid NOT NULL,
  post_created_at timestamptz NOT NULL,
  previous_relation_link text NOT NULL,
  canonical_relation_link text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.guestbook_relation_link_audit TO authenticated;
GRANT ALL ON public.guestbook_relation_link_audit TO service_role;
ALTER TABLE public.guestbook_relation_link_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read relation link audit" ON public.guestbook_relation_link_audit
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Backup of exactly the divergent rows, then neutralise only their relation_link (content, gestures, payments untouched).
WITH e AS (
  SELECT id, memorial_id, user_id, created_at, btrim(relation_link) AS l,
         first_value(btrim(relation_link)) OVER (PARTITION BY memorial_id, user_id ORDER BY created_at, id) AS c
  FROM public.guestbook_posts
  WHERE user_id IS NOT NULL AND nullif(btrim(relation_link), '') IS NOT NULL
)
INSERT INTO public.guestbook_relation_link_audit (post_id, memorial_id, user_id, post_created_at, previous_relation_link, canonical_relation_link, reason)
SELECT id, memorial_id, user_id, created_at, l, c, 'historic_divergence_neutralised' FROM e WHERE l <> c;

UPDATE public.guestbook_posts g SET relation_link = NULL
FROM public.guestbook_relation_link_audit a
WHERE a.post_id = g.id AND a.reason = 'historic_divergence_neutralised' AND btrim(g.relation_link) = a.previous_relation_link;

CREATE OR REPLACE FUNCTION public.guard_tribute_relation_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE canonical text;
BEGIN
  IF NEW.relation_link IS NOT NULL AND btrim(NEW.relation_link) = '' THEN NEW.relation_link := NULL; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.relation_link IS NOT DISTINCT FROM OLD.relation_link THEN RETURN NEW; END IF;
    IF OLD.relation_link IS NOT NULL THEN
      -- Only service role or admin may neutralise (set NULL); nobody may rewrite an explicit link.
      IF NEW.relation_link IS NULL AND (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin')) THEN RETURN NEW; END IF;
      RAISE EXCEPTION 'RELATION_LINK_LOCKED: le lien déclaré d''un hommage ne peut pas être modifié' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF NEW.user_id IS NULL OR NEW.relation_link IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.memorial_id::text || ':' || NEW.user_id::text, 0));
  SELECT btrim(p.relation_link) INTO canonical FROM public.guestbook_posts p
   WHERE p.memorial_id = NEW.memorial_id AND p.user_id = NEW.user_id AND p.id <> NEW.id
     AND nullif(btrim(p.relation_link), '') IS NOT NULL
   ORDER BY p.created_at, p.id LIMIT 1;
  IF canonical IS NOT NULL AND canonical <> btrim(NEW.relation_link) THEN
    RAISE EXCEPTION 'RELATION_LINK_LOCKED: lien déjà déclaré sur ce mémorial (%)', canonical USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_tribute_relation_link() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS aab_guard_tribute_relation_link ON public.guestbook_posts;
CREATE TRIGGER aab_guard_tribute_relation_link BEFORE INSERT OR UPDATE OF relation_link ON public.guestbook_posts
  FOR EACH ROW EXECUTE FUNCTION public.guard_tribute_relation_link();