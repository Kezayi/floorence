CREATE OR REPLACE FUNCTION public.get_resolved_memorial_lineage(p_master_id uuid)
RETURNS TABLE(
  endpoint_a uuid, endpoint_b uuid, normalized_type text, lineage_class text,
  relation_labels text[], status text, is_conflict boolean,
  relation_ids uuid[], origin_memorial_ids uuid[]
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$
  -- Biological projection of get_resolved_memorial_relations (same caller rights).
  -- Classes: filiation_directe = PARENT/CHILD/GRANDPARENT/GRANDCHILD;
  -- collaterale = SIBLING; autre_biologique = UNCLE/NEPHEW/COUSIN.
  -- SPOUSE, social and unknown (NULL) types are excluded.
  SELECT r.endpoint_a, r.endpoint_b, r.normalized_type,
         CASE
           WHEN r.normalized_type IN ('PARENT','CHILD','GRANDPARENT','GRANDCHILD') THEN 'filiation_directe'
           WHEN r.normalized_type = 'SIBLING' THEN 'collaterale'
           ELSE 'autre_biologique'
         END,
         r.relation_labels, r.status, r.is_conflict, r.relation_ids, r.origin_memorial_ids
  FROM public.get_resolved_memorial_relations(p_master_id) r
  WHERE r.normalized_type IN ('PARENT','CHILD','GRANDPARENT','GRANDCHILD','SIBLING','UNCLE','NEPHEW','COUSIN')
  ORDER BY r.endpoint_a, r.endpoint_b, r.normalized_type, r.status
$$;
REVOKE ALL ON FUNCTION public.get_resolved_memorial_lineage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_resolved_memorial_lineage(uuid) TO anon, authenticated;