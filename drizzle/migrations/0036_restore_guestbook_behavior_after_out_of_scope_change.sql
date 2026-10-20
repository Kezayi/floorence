ALTER TABLE public.guestbook_posts ALTER COLUMN moderation_status SET DEFAULT 'approved';
COMMENT ON COLUMN public.guestbook_posts.moderation_status IS 'DEPRECATED: added outside requested status audit; not used for access or publication. Existing publication rules restored.';
COMMENT ON COLUMN public.guestbook_posts.moderated_at IS 'DEPRECATED: unused editorial experiment outside audit scope.';
COMMENT ON COLUMN public.guestbook_posts.moderated_by IS 'DEPRECATED: unused editorial experiment outside audit scope.';
CREATE OR REPLACE FUNCTION public.guard_guestbook_moderation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.guard_guestbook_moderation() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.moderate_guestbook_post(p_post_id uuid,p_decision text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Disabled: outside requested audit scope' USING ERRCODE='42501'; END $$;
REVOKE ALL ON FUNCTION public.moderate_guestbook_post(uuid,text) FROM PUBLIC,anon,authenticated;
ALTER POLICY "Public can view visible tributes" ON public.guestbook_posts USING (is_hidden=false AND deleted_at IS NULL);
DO $migration$
DECLARE r record; d text;
BEGIN
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('get_public_guestbook_posts','get_public_guestbook_posts_consolidated','get_memorial_gesture_stats','get_memorial_gesture_stats_consolidated','get_contributor_profile','rel_p1_is_eligible','rag_reindex_memorial','rag_hybrid_search') LOOP
   d := pg_get_functiondef(r.oid);
   d := replace(d,'gp.is_hidden = false AND gp.moderation_status = ''approved''','gp.is_hidden = false');
   d := replace(d,'NOT g.is_hidden AND g.moderation_status = ''approved''','NOT g.is_hidden');
   EXECUTE d;
 END LOOP;
END $migration$;