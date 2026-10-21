CREATE OR REPLACE FUNCTION public.get_memorial_tribute_geography(p_memorial_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH base AS (
    SELECT gp.author_country_code AS c,
           COALESCE(gp.user_id::text, 'post:' || gp.id::text) AS a
    FROM public.guestbook_posts gp
    JOIN public.memorials m ON m.id = gp.memorial_id
    WHERE gp.memorial_id = p_memorial_id
      AND gp.is_hidden = false AND gp.deleted_at IS NULL
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
$$;
REVOKE ALL ON FUNCTION public.get_memorial_tribute_geography(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_memorial_tribute_geography(uuid) TO anon, authenticated;