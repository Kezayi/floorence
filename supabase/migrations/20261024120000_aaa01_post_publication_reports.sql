-- AAA-CHANTIER-01: post-publication moderation, independent of financial visibility.
-- No historical row rewrite, no payment mutation, no family authority inferred.
BEGIN;
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
CREATE POLICY reports_own_read ON public.guestbook_reports FOR SELECT TO authenticated USING(reporter_id=auth.uid());
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
     AND NOT (public.has_role(auth.uid(),'admin') AND current_setting('app.aaa01_editorial',true)='on') THEN
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

DROP POLICY "Public can view visible tributes" ON public.guestbook_posts;
CREATE POLICY "Public can view visible tributes" ON public.guestbook_posts FOR SELECT TO anon,authenticated
 USING(NOT is_hidden AND NOT editorial_hidden AND deleted_at IS NULL);
-- Restrictive SELECT prevents owner/admin table reads from leaking hidden content via invoker public views.
-- Owner/admin private reads remain supported by their existing policies; public views have explicit filters below.

CREATE OR REPLACE FUNCTION public.get_memorial_gesture_stats(p_memorial_ids uuid[])
 RETURNS TABLE(memorial_id uuid, post_count bigint, total_candles bigint, total_flowers bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT gp.memorial_id, COUNT(*)::bigint, COALESCE(SUM(gp.candle_count), 0)::bigint, COALESCE(SUM(gp.flower_count), 0)::bigint
  FROM public.guestbook_posts gp
  WHERE gp.memorial_id = ANY(p_memorial_ids) AND gp.is_hidden = false AND gp.editorial_hidden = false AND gp.deleted_at IS NULL
  GROUP BY gp.memorial_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_contributor_profile(p_post_id uuid, p_limit integer DEFAULT 5, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_viewer uuid := auth.uid();
  v_contrib uuid; v_memorial uuid;
  v_lim int := least(greatest(coalesce(p_limit,5),1),20);
  v_off int := greatest(coalesce(p_offset,0),0);
  v_result jsonb;
BEGIN
  IF v_viewer IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000'; END IF;

  SELECT gp.user_id, gp.memorial_id INTO v_contrib, v_memorial
  FROM public.guestbook_posts gp
  JOIN public.memorials m ON m.id = gp.memorial_id
  WHERE gp.id = p_post_id AND gp.deleted_at IS NULL AND gp.is_hidden = false AND gp.editorial_hidden = false
    AND m.is_published AND m.deleted_at IS NULL;

  IF NOT public.rel_p1_can_view(v_viewer, v_memorial) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF v_memorial IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_contrib IS NULL THEN RETURN jsonb_build_object('resolved', false); END IF;

  WITH vis AS (
    SELECT gp.memorial_id, gp.user_id, gp.created_at, gp.id, gp.content, gp.candle_count, gp.flower_count,
           gp.author_name, gp.author_photo_url, gp.relation_category, nullif(gp.relation_link,'') AS relation_link,
           coalesce(nullif(gp.relation_link,''), gp.relation_category) AS rel
    FROM public.guestbook_posts gp JOIN public.memorials m ON m.id = gp.memorial_id
    WHERE gp.deleted_at IS NULL AND gp.is_hidden = false AND gp.editorial_hidden = false AND m.is_published AND m.deleted_at IS NULL
      AND gp.user_id IN (v_viewer, v_contrib)
  ),
  here AS (SELECT * FROM vis WHERE user_id = v_contrib AND memorial_id = v_memorial),
  shared AS (
    SELECT m.first_name || ' ' || m.last_name AS name, m.slug,
      (SELECT string_agg(DISTINCT a.rel, ', ') FROM vis a WHERE a.memorial_id = m.id AND a.user_id = v_viewer) AS my_rel,
      (SELECT string_agg(DISTINCT b.rel, ', ') FROM vis b WHERE b.memorial_id = m.id AND b.user_id = v_contrib) AS their_rel
    FROM public.memorials m
    WHERE v_viewer <> v_contrib
      AND m.id IN (SELECT memorial_id FROM vis WHERE user_id = v_viewer)
      AND m.id IN (SELECT memorial_id FROM vis WHERE user_id = v_contrib)
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'resolved', true,
    'is_self', v_viewer = v_contrib,
    'author_name', coalesce((SELECT display_name FROM public.profiles WHERE user_id = v_contrib LIMIT 1),
                            (SELECT author_name FROM here ORDER BY created_at DESC LIMIT 1)),
    'author_photo_url', (SELECT author_photo_url FROM here WHERE author_photo_url IS NOT NULL ORDER BY created_at DESC LIMIT 1),
    'totals', jsonb_build_object('posts', (SELECT count(*) FROM here),
                                 'candles', (SELECT coalesce(sum(candle_count),0) FROM here),
                                 'flowers', (SELECT coalesce(sum(flower_count),0) FROM here)),
    'interactions', coalesce((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'created_at', s.created_at, 'content', s.content,
                               'candles', s.candle_count, 'flowers', s.flower_count) ORDER BY s.created_at DESC)
                              FROM (SELECT * FROM here ORDER BY created_at DESC LIMIT v_lim OFFSET v_off) s), '[]'::jsonb),
    'relation', (SELECT jsonb_build_object('category', relation_category, 'link', relation_link, 'status', 'declared')
                 FROM here ORDER BY created_at DESC LIMIT 1),
    'shared_anchors', coalesce((SELECT jsonb_agg(jsonb_build_object('name', name, 'slug', slug, 'my_relation', my_rel, 'their_relation', their_rel)) FROM shared), '[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_memorial_gesture_stats_consolidated(p_master_id uuid)
 RETURNS TABLE(memorial_id uuid, is_total boolean, post_count bigint, total_candles bigint, total_flowers bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH fam AS (
    SELECT DISTINCT f AS mid FROM public.get_memorial_family_ids(p_master_id) f
  ), per AS (
    SELECT fam.mid,
           COUNT(gp.id)::bigint AS pc,
           COALESCE(SUM(gp.candle_count), 0)::bigint AS tc,
           COALESCE(SUM(gp.flower_count), 0)::bigint AS tf
    FROM fam
    LEFT JOIN public.guestbook_posts gp
      ON gp.memorial_id = fam.mid AND gp.is_hidden = false AND gp.editorial_hidden = false AND gp.deleted_at IS NULL
    GROUP BY fam.mid
  )
  SELECT NULL::uuid, true, COALESCE(SUM(pc),0)::bigint, COALESCE(SUM(tc),0)::bigint, COALESCE(SUM(tf),0)::bigint FROM per
  UNION ALL
  SELECT mid, false, pc, tc, tf FROM per
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_guestbook_posts(p_memorial_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, memorial_id uuid, author_name text, relation_category text, relation_link text, content text, photos text[], candle_count integer, flower_count integer, created_at timestamp with time zone, updated_at timestamp with time zone, author_photo_url text, user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT gp.id, gp.memorial_id, gp.author_name, gp.relation_category, gp.relation_link,
         gp.content, gp.photos, gp.candle_count, gp.flower_count, gp.created_at,
         gp.updated_at, gp.author_photo_url, gp.user_id
  FROM public.guestbook_posts gp
  WHERE (p_memorial_id IS NULL OR gp.memorial_id = p_memorial_id)
    AND gp.is_hidden = false AND gp.editorial_hidden = false
    AND gp.deleted_at IS NULL
  ORDER BY gp.created_at DESC, gp.id DESC
  LIMIT LEAST(p_limit, 200)
  OFFSET p_offset
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_guestbook_posts_consolidated(p_master_id uuid, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, memorial_id uuid, author_name text, relation_category text, relation_link text, content text, photos text[], candle_count integer, flower_count integer, created_at timestamp with time zone, updated_at timestamp with time zone, author_photo_url text, user_id uuid)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT gp.id, gp.memorial_id, gp.author_name, gp.relation_category, gp.relation_link,
         gp.content, gp.photos, gp.candle_count, gp.flower_count, gp.created_at,
         gp.updated_at, gp.author_photo_url, gp.user_id
  FROM public.guestbook_posts gp
  WHERE gp.memorial_id IN (SELECT f FROM public.get_memorial_family_ids(p_master_id) f)
    AND gp.is_hidden = false AND gp.editorial_hidden = false
    AND gp.deleted_at IS NULL
  ORDER BY gp.created_at DESC, gp.id DESC
  LIMIT LEAST(p_limit, 200)
  OFFSET p_offset
$function$
;

CREATE OR REPLACE FUNCTION public.get_public_tribute_countries(p_post_ids uuid[])
 RETURNS TABLE(id uuid, country_code text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT g.id, g.author_country_code FROM public.guestbook_posts g
  WHERE g.id = ANY(p_post_ids[1:200]) AND g.is_hidden = false AND g.editorial_hidden = false AND g.deleted_at IS NULL
    AND g.author_country_code IS NOT NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.get_memorial_tribute_geography(p_memorial_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT gp.author_country_code AS c,
           COALESCE(gp.user_id::text, 'post:' || gp.id::text) AS a
    FROM public.guestbook_posts gp
    JOIN public.memorials m ON m.id = gp.memorial_id
    WHERE gp.memorial_id = p_memorial_id
      AND gp.is_hidden = false AND gp.editorial_hidden = false AND gp.deleted_at IS NULL
      AND gp.author_country_code IS NOT NULL
      AND m.is_published = true AND m.deleted_at IS NULL
  ), per AS (
    SELECT c, count(DISTINCT a) AS contributors, count(*) AS tributes FROM base GROUP BY c
  )
  SELECT jsonb_build_object(
    'countries', (SELECT count(*) FROM per),
    'contributors', (SELECT count(DISTINCT a) FROM base),
    'tributes', (SELECT count(*) FROM base),
    'by_country', COALESCE((SELECT jsonb_agg(jsonb_build_object('code', c, 'contributors', contributors, 'tributes', tributes)
                     ORDER BY contributors DESC, c) FROM per), '[]'::jsonb)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_memorial_social_stats(target_memorial_id uuid)
 RETURNS TABLE(category text, count bigint)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT relation_category, COUNT(*)
    FROM public.guestbook_posts
    WHERE memorial_id = target_memorial_id AND NOT is_hidden AND NOT editorial_hidden AND deleted_at IS NULL
    GROUP BY relation_category;
END;
$function$
;

CREATE OR REPLACE VIEW public.public_guestbook WITH (security_invoker=true) AS  SELECT id,
    memorial_id,
    author_name,
    author_photo_url,
    content,
    created_at,
    relation_category,
    relation_link
   FROM guestbook_posts WHERE NOT is_hidden AND NOT editorial_hidden AND deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_social_inferences WITH (security_invoker=true) AS  SELECT user_id,
    ( SELECT profiles.display_name
           FROM profiles
          WHERE (profiles.user_id = gp.user_id)
         LIMIT 1) AS author_name,
    count(DISTINCT memorial_id) AS total_memorials,
    jsonb_agg(DISTINCT jsonb_build_object('memorial_id', memorial_id, 'relation', relation_category)) AS detail_liens,
    NULL::jsonb AS connexions_suggerees
   FROM guestbook_posts gp
  WHERE (user_id IS NOT NULL) AND NOT gp.is_hidden AND NOT gp.editorial_hidden AND gp.deleted_at IS NULL
  GROUP BY user_id;

COMMIT;
