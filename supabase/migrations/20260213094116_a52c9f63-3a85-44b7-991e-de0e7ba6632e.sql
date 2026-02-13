
DROP VIEW IF EXISTS public.backoffice_humanity_index;

CREATE VIEW public.backoffice_humanity_index WITH (security_invoker = on) AS
SELECT
  m.id AS memorial_id,
  COALESCE(cat.density_score, 0)::bigint AS density_score,
  (COALESCE(m.total_candles, 0) + COALESCE(m.total_flowers, 0) + ROUND(COALESCE(m.total_posts, 0) * 1.5))::bigint AS gesture_score,
  (COALESCE(links.link_count, 0) * 5)::bigint AS inference_bonus,
  (COALESCE(cat.density_score, 0)
    + COALESCE(m.total_candles, 0) + COALESCE(m.total_flowers, 0) + ROUND(COALESCE(m.total_posts, 0) * 1.5)
    + COALESCE(links.link_count, 0) * 5)::bigint AS humanity_index
FROM public.memorials m
LEFT JOIN LATERAL (
  SELECT SUM(
    CASE
      WHEN gp.relation_category = 'Famille Directe' THEN 10
      WHEN gp.relation_category = 'Socio-Cœur' THEN 8
      WHEN gp.relation_category = 'Famille Élargie' THEN 7
      WHEN gp.relation_category = 'Alliés' THEN 6
      ELSE 2
    END
  )::bigint AS density_score
  FROM public.guestbook_posts gp
  WHERE gp.memorial_id = m.id AND gp.is_hidden = false
) cat ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS link_count
  FROM public.memorial_relations mr
  WHERE mr.status = 'accepted'
    AND (mr.memorial_id_1 = m.id OR mr.memorial_id_2 = m.id)
) links ON true
WHERE m.merged_into IS NULL;
