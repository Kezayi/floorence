CREATE OR REPLACE FUNCTION public.rel_p1_can_view(p_user uuid, p_memorial uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_user IS NOT NULL AND (
    public.has_role(p_user, 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = p_memorial AND m.created_by = p_user AND m.deleted_at IS NULL)
    OR public.rel_p1_is_eligible(p_user)
  );
$$;
REVOKE ALL ON FUNCTION public.rel_p1_can_view(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_viewer_relational_eligibility_for(p_memorial_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.rel_p1_can_view(auth.uid(), p_memorial_id);
$$;
REVOKE ALL ON FUNCTION public.get_viewer_relational_eligibility_for(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_viewer_relational_eligibility_for(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_contributor_profile(p_post_id uuid, p_limit integer DEFAULT 5, p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
  WHERE gp.id = p_post_id AND gp.deleted_at IS NULL AND gp.is_hidden = false
    AND m.is_published AND m.deleted_at IS NULL;

  IF NOT public.rel_p1_can_view(v_viewer, v_memorial) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF v_memorial IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_contrib IS NULL THEN RETURN jsonb_build_object('resolved', false); END IF;

  WITH vis AS (
    SELECT gp.memorial_id, gp.user_id, gp.created_at, gp.id, gp.content, gp.candle_count, gp.flower_count,
           gp.author_name, gp.author_photo_url, gp.relation_category, nullif(gp.relation_link,'') AS relation_link,
           coalesce(nullif(gp.relation_link,''), gp.relation_category) AS rel
    FROM public.guestbook_posts gp JOIN public.memorials m ON m.id = gp.memorial_id
    WHERE gp.deleted_at IS NULL AND gp.is_hidden = false AND m.is_published AND m.deleted_at IS NULL
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
$$;
REVOKE ALL ON FUNCTION public.get_contributor_profile(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_contributor_profile(uuid, integer, integer) TO authenticated;