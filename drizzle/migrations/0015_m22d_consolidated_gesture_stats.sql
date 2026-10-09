CREATE OR REPLACE FUNCTION public.get_memorial_gesture_stats_consolidated(p_master_id uuid)
RETURNS TABLE(memorial_id uuid, is_total boolean, post_count bigint, total_candles bigint, total_flowers bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$
  WITH fam AS (
    SELECT DISTINCT f AS mid FROM public.get_memorial_family_ids(p_master_id) f
  ), per AS (
    SELECT fam.mid,
           COUNT(gp.id)::bigint AS pc,
           COALESCE(SUM(gp.candle_count), 0)::bigint AS tc,
           COALESCE(SUM(gp.flower_count), 0)::bigint AS tf
    FROM fam
    LEFT JOIN public.guestbook_posts gp
      ON gp.memorial_id = fam.mid AND gp.is_hidden = false AND gp.deleted_at IS NULL
    GROUP BY fam.mid
  )
  SELECT NULL::uuid, true, COALESCE(SUM(pc),0)::bigint, COALESCE(SUM(tc),0)::bigint, COALESCE(SUM(tf),0)::bigint FROM per
  UNION ALL
  SELECT mid, false, pc, tc, tf FROM per
$$;
REVOKE ALL ON FUNCTION public.get_memorial_gesture_stats_consolidated(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_memorial_gesture_stats_consolidated(uuid) TO anon, authenticated;