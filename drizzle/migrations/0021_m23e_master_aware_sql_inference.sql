CREATE OR REPLACE FUNCTION public.generate_suggested_links(p_memorial_id_1 uuid DEFAULT NULL::uuid, p_memorial_id_2 uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  scope_ids uuid[];
  rec RECORD;
  r_px text;
  r_py text;
  inferred text;
  inferred_label text;
  v_r1 uuid;
  v_r2 uuid;
BEGIN
  -- FIX B2: only callable from the memorial_relations trigger (no direct API call)
  IF pg_trigger_depth() < 1 THEN
    RAISE EXCEPTION 'generate_suggested_links: direct call not allowed' USING ERRCODE = '42501';
  END IF;

  -- M2.3E: identities are resolved as COALESCE(merged_into, id)
  IF p_memorial_id_1 IS NOT NULL AND p_memorial_id_2 IS NOT NULL THEN
    SELECT COALESCE(m.merged_into, m.id) INTO v_r1 FROM public.memorials m WHERE m.id = p_memorial_id_1;
    SELECT COALESCE(m.merged_into, m.id) INTO v_r2 FROM public.memorials m WHERE m.id = p_memorial_id_2;
    v_r1 := COALESCE(v_r1, p_memorial_id_1);
    v_r2 := COALESCE(v_r2, p_memorial_id_2);
    SELECT ARRAY(
      SELECT DISTINCT unnest(ARRAY[COALESCE(m1.merged_into, m1.id), COALESCE(m2.merged_into, m2.id)])
      FROM public.memorial_relations r
      JOIN public.memorials m1 ON m1.id = r.memorial_id_1
      JOIN public.memorials m2 ON m2.id = r.memorial_id_2
      WHERE r.status = 'accepted'
        AND (COALESCE(m1.merged_into, m1.id) IN (v_r1, v_r2)
          OR COALESCE(m2.merged_into, m2.id) IN (v_r1, v_r2))
    ) INTO scope_ids;
    scope_ids := scope_ids || ARRAY[v_r1, v_r2];
  ELSE
    SELECT ARRAY(
      SELECT DISTINCT unnest(ARRAY[COALESCE(m1.merged_into, m1.id), COALESCE(m2.merged_into, m2.id)])
      FROM public.memorial_relations r
      JOIN public.memorials m1 ON m1.id = r.memorial_id_1
      JOIN public.memorials m2 ON m2.id = r.memorial_id_2
      WHERE r.status = 'accepted'
    ) INTO scope_ids;
  END IF;

  IF scope_ids IS NULL OR array_length(scope_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Convention: memorial_id_1 IS relation_type OF memorial_id_2 (raw declarations, untouched).
  -- Endpoints and pivot are matched on resolved identities; self-loops (source<->Master) are dropped,
  -- so sharing a Master is never treated as kinship.
  FOR rec IN
    WITH rr AS (
      SELECT COALESCE(m1.merged_into, m1.id) AS a, COALESCE(m2.merged_into, m2.id) AS b, r.relation_type
      FROM public.memorial_relations r
      JOIN public.memorials m1 ON m1.id = r.memorial_id_1
      JOIN public.memorials m2 ON m2.id = r.memorial_id_2
      WHERE r.status = 'accepted'
        AND COALESCE(m1.merged_into, m1.id) <> COALESCE(m2.merged_into, m2.id)
    )
    -- Case 1: P = r1.a = r2.a
    SELECT r1.a AS p_id, r1.b AS x_id, r1.relation_type AS r1_type,
           r2.b AS y_id, r2.relation_type AS r2_type, false AS inv1, false AS inv2
    FROM rr r1 JOIN rr r2 ON r1.a = r2.a AND r1.b <> r2.b
    WHERE r1.a = ANY(scope_ids)
    UNION ALL
    -- Case 2: P = r1.b = r2.b
    SELECT r1.b, r1.a, r1.relation_type, r2.a, r2.relation_type, true, true
    FROM rr r1 JOIN rr r2 ON r1.b = r2.b AND r1.a <> r2.a
    WHERE r1.b = ANY(scope_ids)
    UNION ALL
    -- Case 3: P = r1.a = r2.b
    SELECT r1.a, r1.b, r1.relation_type, r2.a, r2.relation_type, false, true
    FROM rr r1 JOIN rr r2 ON r1.a = r2.b AND r1.b <> r2.a
    WHERE r1.a = ANY(scope_ids)
    UNION ALL
    -- Case 4: P = r1.b = r2.a
    SELECT r1.b, r1.a, r1.relation_type, r2.b, r2.relation_type, true, false
    FROM rr r1 JOIN rr r2 ON r1.b = r2.a AND r1.a <> r2.b
    WHERE r1.b = ANY(scope_ids)
  LOOP
    IF rec.x_id = rec.y_id THEN
      CONTINUE;
    END IF;

    r_px := public.normalize_relation_type(rec.r1_type);
    r_py := public.normalize_relation_type(rec.r2_type);
    -- FIX B1: invert when the pivot is memorial_id_2 of the relation
    IF rec.inv1 THEN r_px := public.inverse_normalized(r_px); END IF;
    IF rec.inv2 THEN r_py := public.inverse_normalized(r_py); END IF;

    IF r_px IS NULL OR r_py IS NULL THEN
      CONTINUE;
    END IF;

    inferred := public.transitive_rule(r_px, r_py);
    IF inferred IS NULL THEN
      CONTINUE;
    END IF;

    inferred_label := public.normalized_to_label(inferred);

    IF NOT EXISTS (
      -- M2.3E: any accepted relation between the two resolved families
      SELECT 1 FROM public.memorial_relations r
      JOIN public.memorials m1 ON m1.id = r.memorial_id_1
      JOIN public.memorials m2 ON m2.id = r.memorial_id_2
      WHERE r.status = 'accepted'
        AND ((COALESCE(m1.merged_into, m1.id) = rec.x_id AND COALESCE(m2.merged_into, m2.id) = rec.y_id)
          OR (COALESCE(m1.merged_into, m1.id) = rec.y_id AND COALESCE(m2.merged_into, m2.id) = rec.x_id))
    )
    AND NOT EXISTS (
      -- M2.3E: any existing suggestion between the two resolved families
      SELECT 1 FROM public.suggested_links s
      JOIN public.memorials ms ON ms.id = s.source_memorial_id
      JOIN public.memorials mt ON mt.id = s.target_memorial_id
      WHERE (COALESCE(ms.merged_into, ms.id) = rec.x_id AND COALESCE(mt.merged_into, mt.id) = rec.y_id)
         OR (COALESCE(ms.merged_into, ms.id) = rec.y_id AND COALESCE(mt.merged_into, mt.id) = rec.x_id)
    )
    -- FIX B2: never expose a private memorial to another owner
    AND (
      SELECT (mx.is_published AND my.is_published) OR mx.created_by = my.created_by
      FROM public.memorials mx, public.memorials my
      WHERE mx.id = rec.x_id AND my.id = rec.y_id
    )
    AND (
      inferred NOT IN ('PARENT', 'GRANDPARENT')
      OR (
        SELECT CASE
          WHEN m1.birth_date IS NULL OR m2.birth_date IS NULL THEN true
          WHEN inferred = 'PARENT' THEN
            EXTRACT(YEAR FROM AGE(m2.birth_date, m1.birth_date)) >= 15
          WHEN inferred = 'GRANDPARENT' THEN
            EXTRACT(YEAR FROM AGE(m2.birth_date, m1.birth_date)) >= 30
          ELSE true
        END
        FROM public.memorials m1, public.memorials m2
        WHERE m1.id = rec.x_id AND m2.id = rec.y_id
      )
    )
    THEN
      INSERT INTO public.suggested_links (
        source_memorial_id, target_memorial_id, suggested_relation,
        inference_logic, created_by_ai, status
      ) VALUES (
        rec.x_id,
        rec.y_id,
        inferred_label,
        'Transitivité via ' || (
          -- FIX B2: private pivot name is never stored in a visible suggestion
          SELECT CASE WHEN pm.is_published THEN pm.first_name || ' ' || pm.last_name ELSE 'un avis privé' END
          FROM public.memorials pm WHERE pm.id = rec.p_id
        ) || ' (' || rec.r1_type || ' + ' || rec.r2_type || ')',
        true,
        'pending'
      ) ON CONFLICT ((LEAST(source_memorial_id, target_memorial_id)), (GREATEST(source_memorial_id, target_memorial_id))) DO NOTHING;
    END IF;
  END LOOP;
END;
$function$;