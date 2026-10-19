ALTER TABLE public.guestbook_posts ADD COLUMN moderation_status text NOT NULL DEFAULT 'approved', ADD COLUMN moderated_at timestamptz, ADD COLUMN moderated_by uuid;
ALTER TABLE public.guestbook_posts ALTER COLUMN moderation_status SET DEFAULT 'pending';
ALTER TABLE public.guestbook_posts ADD CONSTRAINT guestbook_moderation_status_check CHECK (moderation_status IN ('pending','approved','rejected'));
COMMENT ON COLUMN public.guestbook_posts.moderation_status IS 'Editorial decision independent of payment/is_hidden. Existing tributes preserved as approved; every new insert is pending.';

CREATE OR REPLACE FUNCTION public.guard_guestbook_moderation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_moderator boolean := coalesce(public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'),false);
BEGIN
 IF TG_OP='INSERT' THEN
   NEW.moderation_status := 'pending'; NEW.moderated_at := NULL; NEW.moderated_by := NULL;
   RETURN NEW;
 END IF;
 IF (NEW.moderation_status,NEW.moderated_at,NEW.moderated_by) IS DISTINCT FROM (OLD.moderation_status,OLD.moderated_at,OLD.moderated_by) AND NOT v_moderator THEN
   RAISE EXCEPTION 'Editorial decision requires moderator' USING ERRCODE='42501';
 END IF;
 IF auth.role()='authenticated' AND NOT v_moderator AND (NEW.user_id,NEW.memorial_id,NEW.payment_reference,NEW.candle_count,NEW.flower_count,NEW.is_hidden) IS DISTINCT FROM (OLD.user_id,OLD.memorial_id,OLD.payment_reference,OLD.candle_count,OLD.flower_count,OLD.is_hidden) THEN
   RAISE EXCEPTION 'Protected tribute fields' USING ERRCODE='42501';
 END IF;
 IF (NEW.content,NEW.photos,NEW.author_name,NEW.relation_category,NEW.relation_link) IS DISTINCT FROM (OLD.content,OLD.photos,OLD.author_name,OLD.relation_category,OLD.relation_link) THEN
   NEW.moderation_status := 'pending'; NEW.moderated_at := NULL; NEW.moderated_by := NULL;
 ELSIF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
   NEW.moderated_at := now(); NEW.moderated_by := auth.uid();
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_guestbook_moderation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER aaa_guard_guestbook_moderation BEFORE INSERT OR UPDATE ON public.guestbook_posts FOR EACH ROW EXECUTE FUNCTION public.guard_guestbook_moderation();

ALTER POLICY "Public can view visible tributes" ON public.guestbook_posts USING (is_hidden=false AND deleted_at IS NULL AND moderation_status='approved');

CREATE OR REPLACE FUNCTION public.moderate_guestbook_post(p_post_id uuid,p_decision text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_old text;
BEGIN
 IF NOT coalesce(public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'),false) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_decision IS NULL OR p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'invalid decision' USING ERRCODE='22023'; END IF;
 SELECT moderation_status INTO v_old FROM public.guestbook_posts WHERE id=p_post_id AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE='P0002'; END IF;
 UPDATE public.guestbook_posts SET moderation_status=p_decision WHERE id=p_post_id;
 INSERT INTO public.audit_logs(action_type,performed_by,details) VALUES ('guestbook_moderated',auth.uid(),jsonb_build_object('guestbook_post_id',p_post_id,'previous',v_old,'decision',p_decision));
END $$;
REVOKE ALL ON FUNCTION public.moderate_guestbook_post(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.moderate_guestbook_post(uuid,text) TO authenticated;

DO $migration$
DECLARE r record; d text; original text;
BEGIN
 FOR r IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('get_public_guestbook_posts','get_public_guestbook_posts_consolidated','get_memorial_gesture_stats','get_memorial_gesture_stats_consolidated','get_contributor_profile','rel_p1_is_eligible','rag_reindex_memorial','rag_hybrid_search') LOOP
   original := pg_get_functiondef(r.oid); d := original;
   d := replace(d,'gp.is_hidden = false','gp.is_hidden = false AND gp.moderation_status = ''approved''');
   d := replace(d,'NOT g.is_hidden','NOT g.is_hidden AND g.moderation_status = ''approved''');
   IF d=original THEN RAISE EXCEPTION 'Missing visibility predicate in %',r.proname; END IF;
   EXECUTE d;
 END LOOP;
END $migration$;

CREATE INDEX guestbook_pending_moderation_idx ON public.guestbook_posts(created_at DESC) WHERE moderation_status='pending' AND deleted_at IS NULL;