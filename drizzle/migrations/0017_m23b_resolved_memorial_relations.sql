CREATE OR REPLACE FUNCTION public.get_resolved_memorial_relations(p_master_id uuid)
RETURNS TABLE(
  endpoint_a uuid, endpoint_b uuid, normalized_type text, relation_labels text[],
  status text, is_biological boolean, is_conflict boolean,
  relation_ids uuid[], origin_memorial_ids uuid[]
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$
  -- Read-only projection. Semantics: memorial_id_1 IS <relation_type> OF memorial_id_2.
  -- Each endpoint is resolved to COALESCE(merged_into, id); RLS of the caller applies
  -- to memorial_relations and memorials (private / inaccessible endpoints drop out).
  WITH fam AS (
    SELECT f AS mid FROM public.get_memorial_family_ids(p_master_id) f
  ),
  rel AS (
    SELECT r.id, r.memorial_id_1, r.memorial_id_2, r.relation_type, r.status,
           public.normalize_relation_type(r.relation_type) AS ntype
    FROM public.memorial_relations r
    WHERE r.memorial_id_1 IN (SELECT mid FROM fam) OR r.memorial_id_2 IN (SELECT mid FROM fam)
  ),
  res AS (
    SELECT rel.*,
           COALESCE(m1.merged_into, m1.id) AS r1,
           COALESCE(m2.merged_into, m2.id) AS r2
    FROM rel
    JOIN public.memorials m1 ON m1.id = rel.memorial_id_1 AND m1.deleted_at IS NULL
    JOIN public.memorials m2 ON m2.id = rel.memorial_id_2 AND m2.deleted_at IS NULL
  ),
  vis AS (
    SELECT res.* FROM res
    JOIN public.memorials t1 ON t1.id = res.r1 AND t1.deleted_at IS NULL AND t1.merged_into IS NULL
    JOIN public.memorials t2 ON t2.id = res.r2 AND t2.deleted_at IS NULL AND t2.merged_into IS NULL
    WHERE res.r1 <> res.r2
  ),
  canon AS (
    SELECT vis.*,
           LEAST(r1, r2) AS a, GREATEST(r1, r2) AS b,
           CASE
             WHEN ntype IS NULL THEN NULL
             WHEN r1 = LEAST(r1, r2) THEN ntype
             ELSE public.inverse_normalized(ntype)
           END AS ctype,
           CASE WHEN ntype IS NULL
                THEN 'RAW:' || CASE WHEN r1 = LEAST(r1, r2) THEN '>' ELSE '<' END || relation_type
                ELSE NULL END AS rawkey
    FROM vis
  ),
  pairs AS (
    SELECT a, b, COUNT(DISTINCT COALESCE(ctype, rawkey)) > 1 AS conflict
    FROM canon GROUP BY a, b
  )
  SELECT c.a, c.b, c.ctype,
         array_agg(DISTINCT c.relation_type ORDER BY c.relation_type),
         c.status,
         (c.ctype IS NOT NULL AND c.ctype <> 'SPOUSE'),
         p.conflict,
         array_agg(DISTINCT c.id ORDER BY c.id),
         (SELECT array_agg(DISTINCT x ORDER BY x)
            FROM unnest(array_agg(c.memorial_id_1) || array_agg(c.memorial_id_2)) x)
  FROM canon c JOIN pairs p ON p.a = c.a AND p.b = c.b
  GROUP BY c.a, c.b, c.ctype, c.rawkey, c.status, p.conflict
  ORDER BY c.a, c.b, c.ctype NULLS LAST, c.status
$$;
REVOKE ALL ON FUNCTION public.get_resolved_memorial_relations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_resolved_memorial_relations(uuid) TO anon, authenticated;