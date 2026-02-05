-- Create a function to get aggregated gesture stats for memorials (publicly accessible)
CREATE OR REPLACE FUNCTION public.get_memorial_gesture_stats(p_memorial_ids uuid[])
RETURNS TABLE (
  memorial_id uuid,
  post_count bigint,
  total_candles bigint,
  total_flowers bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gp.memorial_id,
    COUNT(*)::bigint AS post_count,
    COALESCE(SUM(gp.candle_count), 0)::bigint AS total_candles,
    COALESCE(SUM(gp.flower_count), 0)::bigint AS total_flowers
  FROM public.guestbook_posts gp
  WHERE gp.memorial_id = ANY(p_memorial_ids)
    AND gp.is_hidden = false
  GROUP BY gp.memorial_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;