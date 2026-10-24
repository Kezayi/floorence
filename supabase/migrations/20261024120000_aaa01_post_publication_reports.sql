-- AAA-CHANTIER-01: post-publication moderation, independent of financial visibility.
-- No historical row rewrite, no payment mutation, no family authority inferred.
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.guestbook_posts ADD COLUMN IF NOT EXISTS editorial_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.guestbook_posts ADD COLUMN IF NOT EXISTS editorial_reason text;
ALTER TABLE public.guestbook_posts ADD COLUMN IF NOT EXISTS editorial_at timestamptz;
ALTER TABLE public.guestbook_posts ADD COLUMN IF NOT EXISTS editorial_by uuid;
CREATE TABLE IF NOT EXISTS public.guestbook_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 post_id uuid NOT NULL REFERENCES public.guestbook_posts(id) ON DELETE CASCADE,
 reporter_id uuid NOT NULL,
 reason text NOT NULL CHECK(reason IN ('injure_diffamation','usurpation_parente','publicite_inapproprie','dignite','autre')),
 detail text CHECK(char_length(detail)<=2000),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 decision text CHECK(decision IN ('maintain','hide','restore','trash')),
 decision_reason text, created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz, resolved_by uuid
);
GRANT SELECT ON public.guestbook_reports TO authenticated;
GRANT ALL ON public.guestbook_reports TO service_role;
ALTER TABLE public.guestbook_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reports_own_read ON public.guestbook_reports;
CREATE POLICY reports_own_read ON public.guestbook_reports FOR SELECT TO authenticated USING(reporter_id=auth.uid());
DROP POLICY IF EXISTS reports_admin_read ON public.guestbook_reports;
CREATE POLICY reports_admin_read ON public.guestbook_reports FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX IF NOT EXISTS guestbook_reports_one_open ON public.guestbook_reports(post_id,reporter_id) WHERE status='open';
CREATE INDEX IF NOT EXISTS guestbook_reports_queue ON public.guestbook_reports(status,created_at);

CREATE OR REPLACE FUNCTION public.aaa01_guard_editorial() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.editorial_hidden OR NEW.editorial_reason IS NOT NULL OR NEW.editorial_by IS NOT NULL OR NEW.editorial_at IS NOT NULL THEN
   RAISE EXCEPTION 'editorial_fields_protected' USING ERRCODE='42501';
  END IF;
 ELSE
  IF (NEW.editorial_hidden,NEW.editorial_reason,NEW.editorial_by,NEW.editorial_at) IS DISTINCT FROM
     (OLD.editorial_hidden,OLD.editorial_reason,OLD.editorial_by,OLD.editorial_at)
     AND NOT coalesce(public.has_role(auth.uid(),'admin') AND current_setting('app.aaa01_editorial',true)='on',false) THEN
   RAISE EXCEPTION 'editorial_fields_protected' USING ERRCODE='42501';
  END IF;
  -- Preserve pre-existing disciplinary hiding even when a legacy payment clears is_hidden.
  IF OLD.is_hidden AND NOT NEW.is_hidden AND OLD.hidden_reason IS NOT NULL
     AND current_setting('app.aaa01_editorial',true) IS DISTINCT FROM 'on' THEN
   NEW.editorial_hidden:=true; NEW.editorial_reason:=coalesce(OLD.editorial_reason,OLD.hidden_reason);
   NEW.editorial_by:=coalesce(OLD.editorial_by,OLD.hidden_by); NEW.editorial_at:=coalesce(OLD.editorial_at,OLD.hidden_at,now());
  END IF;
  IF OLD.is_hidden AND NOT NEW.is_hidden AND auth.role()='authenticated' THEN
   RAISE EXCEPTION 'financial_visibility_protected' USING ERRCODE='42501';
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aaa01_editorial_guard ON public.guestbook_posts;
CREATE TRIGGER aaa01_editorial_guard BEFORE INSERT OR UPDATE ON public.guestbook_posts FOR EACH ROW EXECUTE FUNCTION public.aaa01_guard_editorial();

CREATE OR REPLACE FUNCTION public.report_guestbook_post(p_post_id uuid,p_reason text,p_detail text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_post public.guestbook_posts%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE='28000'; END IF;
 IF p_reason IS NULL OR p_reason NOT IN ('injure_diffamation','usurpation_parente','publicite_inapproprie','dignite','autre') OR char_length(p_detail)>2000 THEN
  RAISE EXCEPTION 'invalid_report' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_post FROM public.guestbook_posts WHERE id=p_post_id FOR UPDATE;
 IF NOT FOUND OR v_post.is_hidden OR v_post.editorial_hidden OR v_post.deleted_at IS NOT NULL
    OR NOT EXISTS(SELECT 1 FROM public.memorials WHERE id=v_post.memorial_id AND is_published AND deleted_at IS NULL) THEN
  RAISE EXCEPTION 'tribute_unavailable' USING ERRCODE='P0002'; END IF;
 INSERT INTO public.guestbook_reports(post_id,reporter_id,reason,detail)
 VALUES(p_post_id,auth.uid(),p_reason,nullif(trim(p_detail),''))
 ON CONFLICT(post_id,reporter_id) WHERE status='open' DO NOTHING RETURNING id INTO v_id;
 -- No reliable verified family role exists; creator/heir declarations confer no masking authority.
 RETURN jsonb_build_object('accepted',true,'duplicate',v_id IS NULL,'conservatory_hidden',false);
END $$;
REVOKE ALL ON FUNCTION public.report_guestbook_post(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.report_guestbook_post(uuid,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderate_tribute_editorial(p_post_id uuid,p_action text,p_reason text DEFAULT NULL,p_report_id uuid DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_old public.guestbook_posts%ROWTYPE; v_report public.guestbook_reports%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='42501'; END IF;
 IF p_action IS NULL OR p_action NOT IN ('maintain','hide','restore','trash') THEN RAISE EXCEPTION 'invalid_decision' USING ERRCODE='22023'; END IF;
 IF p_action IN ('hide','trash') AND (coalesce(char_length(trim(p_reason)),0)=0 OR char_length(p_reason)>2000) THEN RAISE EXCEPTION 'reason_required' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_old FROM public.guestbook_posts WHERE id=p_post_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'tribute_unavailable' USING ERRCODE='P0002'; END IF;
 IF p_report_id IS NOT NULL THEN
  SELECT * INTO v_report FROM public.guestbook_reports WHERE id=p_report_id AND post_id=p_post_id FOR UPDATE;
  IF NOT FOUND OR v_report.status<>'open' THEN RAISE EXCEPTION 'report_already_resolved' USING ERRCODE='40001'; END IF;
 END IF;
 IF v_old.deleted_at IS NOT NULL AND p_action<>'maintain' THEN RAISE EXCEPTION 'use_trash_restore' USING ERRCODE='22023'; END IF;
 PERFORM set_config('app.aaa01_editorial','on',true);
 IF p_action='hide' THEN
  UPDATE public.guestbook_posts SET editorial_hidden=true,editorial_reason=trim(p_reason),editorial_at=now(),editorial_by=auth.uid() WHERE id=p_post_id;
 ELSIF p_action='restore' THEN
  -- Editorial restore NEVER clears is_hidden (including unpaid and legacy hidden posts).
  UPDATE public.guestbook_posts SET editorial_hidden=false,editorial_reason=NULL,editorial_at=now(),editorial_by=auth.uid() WHERE id=p_post_id;
 ELSIF p_action='trash' THEN
  UPDATE public.guestbook_posts SET deleted_at=now(),deleted_by=auth.uid(),editorial_hidden=true,editorial_reason=trim(p_reason),editorial_at=now(),editorial_by=auth.uid() WHERE id=p_post_id;
 END IF;
 UPDATE public.guestbook_reports SET status='closed',decision=p_action,decision_reason=nullif(trim(p_reason),''),resolved_at=now(),resolved_by=auth.uid()
 WHERE post_id=p_post_id AND status='open' AND (p_action IN ('hide','trash') OR id=p_report_id);
 INSERT INTO public.audit_logs(action_type,performed_by,details) VALUES('guestbook_editorial_'||p_action,auth.uid(),
 jsonb_build_object('post_id',p_post_id,'report_id',p_report_id,'reason',p_reason,'previous_editorial_hidden',v_old.editorial_hidden,'financial_hidden_preserved',v_old.is_hidden));
 PERFORM set_config('app.aaa01_editorial','off',true);
END $$;
REVOKE ALL ON FUNCTION public.moderate_tribute_editorial(uuid,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.moderate_tribute_editorial(uuid,text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_guestbook_reports(p_status text DEFAULT 'open',p_offset integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='42501'; END IF;
 IF p_status NOT IN ('open','closed') THEN RAISE EXCEPTION 'invalid_status' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('pending',(SELECT count(*) FROM public.guestbook_reports WHERE status='open'),
 'total',(SELECT count(*) FROM public.guestbook_reports WHERE status=p_status),
 'items',coalesce((SELECT jsonb_agg(to_jsonb(q)) FROM (
 SELECT r.*,g.content,g.author_name,g.memorial_id,g.editorial_hidden,g.is_hidden,g.deleted_at,
 m.first_name||' '||m.last_name AS memorial_name,m.slug,
 (SELECT count(*) FROM public.guestbook_reports h WHERE h.post_id=r.post_id) AS report_history
 FROM public.guestbook_reports r JOIN public.guestbook_posts g ON g.id=r.post_id JOIN public.memorials m ON m.id=g.memorial_id
 WHERE r.status=p_status ORDER BY r.created_at ASC,r.id LIMIT 20 OFFSET greatest(p_offset,0))q),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.list_guestbook_reports(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_guestbook_reports(text,integer) TO authenticated;

DROP POLICY IF EXISTS "Public can view visible tributes" ON public.guestbook_posts;
CREATE POLICY "Public can view visible tributes" ON public.guestbook_posts FOR SELECT TO anon,authenticated
 USING(NOT is_hidden AND NOT editorial_hidden AND deleted_at IS NULL);
-- Owner/admin private reads remain supported by their existing policies; public views have explicit filters below.

-- Exact audited live definitions are retained; only public visibility predicates change.
DO $upgrade$
DECLARE n text; d text;
BEGIN
 FOREACH n IN ARRAY ARRAY['get_memorial_gesture_stats','get_memorial_gesture_stats_consolidated','get_public_guestbook_posts','get_public_guestbook_posts_consolidated','get_contributor_profile','get_public_tribute_countries','get_memorial_tribute_geography','get_memorial_social_stats'] LOOP
  SELECT pg_get_functiondef(p.oid) INTO STRICT d FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname='public' AND p.proname=n;
  IF position('editorial_hidden' in d)=0 THEN
   d:=replace(d,'gp.is_hidden = false','gp.is_hidden = false AND gp.editorial_hidden = false');
   d:=replace(d,'g.is_hidden = false','g.is_hidden = false AND g.editorial_hidden = false');
   IF n='get_memorial_gesture_stats' THEN d:=replace(d,'AND gp.editorial_hidden = false','AND gp.editorial_hidden = false AND gp.deleted_at IS NULL'); END IF;
   IF n='get_memorial_social_stats' THEN d:=replace(d,'WHERE memorial_id = target_memorial_id','WHERE memorial_id = target_memorial_id AND NOT is_hidden AND NOT editorial_hidden AND deleted_at IS NULL'); END IF;
   IF position('editorial_hidden' in d)=0 THEN RAISE EXCEPTION 'unrecognized public function %',n; END IF;
   EXECUTE d;
  END IF;
 END LOOP;
END $upgrade$;
CREATE OR REPLACE VIEW public.public_guestbook WITH (security_invoker=true) AS
 SELECT id,memorial_id,author_name,author_photo_url,content,created_at,relation_category,relation_link
 FROM public.guestbook_posts WHERE NOT is_hidden AND NOT editorial_hidden AND deleted_at IS NULL;
CREATE OR REPLACE VIEW public.v_social_inferences WITH (security_invoker=true) AS
 SELECT user_id,(SELECT profiles.display_name FROM public.profiles WHERE profiles.user_id=gp.user_id LIMIT 1) AS author_name,
 count(DISTINCT memorial_id) AS total_memorials,
 jsonb_agg(DISTINCT jsonb_build_object('memorial_id',memorial_id,'relation',relation_category)) AS detail_liens,
 NULL::jsonb AS connexions_suggerees
 FROM public.guestbook_posts gp WHERE user_id IS NOT NULL AND NOT is_hidden AND NOT editorial_hidden AND deleted_at IS NULL GROUP BY user_id;
