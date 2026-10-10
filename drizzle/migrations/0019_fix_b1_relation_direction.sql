CREATE OR REPLACE FUNCTION public.generate_suggested_links(p_memorial_id_1 uuid DEFAULT NULL::uuid, p_memorial_id_2 uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  scope_ids uuid[];
  rec RECORD;
  r_px text;
  r_py text;
  inferred text;
  inferred_label text;
  pair_key text;
BEGIN
  IF p_memorial_id_1 IS NOT NULL AND p_memorial_id_2 IS NOT NULL THEN
    SELECT ARRAY(
      SELECT DISTINCT unnest(ARRAY[r.memorial_id_1, r.memorial_id_2])
      FROM memorial_relations r
      WHERE r.status = 'accepted'
        AND (r.memorial_id_1 IN (p_memorial_id_1, p_memorial_id_2)
          OR r.memorial_id_2 IN (p_memorial_id_1, p_memorial_id_2))
    ) INTO scope_ids;
    scope_ids := scope_ids || ARRAY[p_memorial_id_1, p_memorial_id_2];
  ELSE
    SELECT ARRAY(
      SELECT DISTINCT unnest(ARRAY[r.memorial_id_1, r.memorial_id_2])
      FROM memorial_relations r
      WHERE r.status = 'accepted'
    ) INTO scope_ids;
  END IF;

  IF scope_ids IS NULL OR array_length(scope_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Convention: memorial_id_1 IS relation_type OF memorial_id_2.
  -- Rule input: P is r_px of X, P is r_py of Y.
  -- inv1/inv2 = true when P is memorial_id_2 of r1/r2 (type must be inverted).
  FOR rec IN
    -- Case 1: P = r1.id1 = r2.id1
    SELECT r1.memorial_id_1 AS p_id, r1.memorial_id_2 AS x_id, r1.relation_type AS r1_type,
           r2.memorial_id_2 AS y_id, r2.relation_type AS r2_type,
           false AS inv1, false AS inv2
    FROM memorial_relations r1
    JOIN memorial_relations r2
      ON r1.memorial_id_1 = r2.memorial_id_1
      AND r1.memorial_id_2 != r2.memorial_id_2
    WHERE r1.status = 'accepted' AND r2.status = 'accepted'
      AND r1.memorial_id_1 = ANY(scope_ids)
    UNION ALL
    -- Case 2: P = r1.id2 = r2.id2
    SELECT r1.memorial_id_2, r1.memorial_id_1, r1.relation_type,
           r2.memorial_id_1, r2.relation_type,
           true, true
    FROM memorial_relations r1
    JOIN memorial_relations r2
      ON r1.memorial_id_2 = r2.memorial_id_2
      AND r1.memorial_id_1 != r2.memorial_id_1
    WHERE r1.status = 'accepted' AND r2.status = 'accepted'
      AND r1.memorial_id_2 = ANY(scope_ids)
    UNION ALL
    -- Case 3: P = r1.id1 = r2.id2
    SELECT r1.memorial_id_1, r1.memorial_id_2, r1.relation_type,
           r2.memorial_id_1, r2.relation_type,
           false, true
    FROM memorial_relations r1
    JOIN memorial_relations r2
      ON r1.memorial_id_1 = r2.memorial_id_2
      AND r1.memorial_id_2 != r2.memorial_id_1
    WHERE r1.status = 'accepted' AND r2.status = 'accepted'
      AND r1.memorial_id_1 = ANY(scope_ids)
    UNION ALL
    -- Case 4: P = r1.id2 = r2.id1
    SELECT r1.memorial_id_2, r1.memorial_id_1, r1.relation_type,
           r2.memorial_id_2, r2.relation_type,
           true, false
    FROM memorial_relations r1
    JOIN memorial_relations r2
      ON r1.memorial_id_2 = r2.memorial_id_1
      AND r1.memorial_id_1 != r2.memorial_id_2
    WHERE r1.status = 'accepted' AND r2.status = 'accepted'
      AND r1.memorial_id_2 = ANY(scope_ids)
  LOOP
    r_px := normalize_relation_type(rec.r1_type);
    r_py := normalize_relation_type(rec.r2_type);
    -- FIX B1: invert when the pivot is memorial_id_2 of the relation
    IF rec.inv1 THEN r_px := inverse_normalized(r_px); END IF;
    IF rec.inv2 THEN r_py := inverse_normalized(r_py); END IF;

    IF r_px IS NULL OR r_py IS NULL THEN
      CONTINUE;
    END IF;

    inferred := transitive_rule(r_px, r_py);
    IF inferred IS NULL THEN
      CONTINUE;
    END IF;

    inferred_label := normalized_to_label(inferred);

    IF rec.x_id < rec.y_id THEN
      pair_key := rec.x_id::text || '|' || rec.y_id::text;
    ELSE
      pair_key := rec.y_id::text || '|' || rec.x_id::text;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM memorial_relations
      WHERE status = 'accepted'
        AND ((memorial_id_1 = rec.x_id AND memorial_id_2 = rec.y_id)
          OR (memorial_id_1 = rec.y_id AND memorial_id_2 = rec.x_id))
    )
    AND NOT EXISTS (
      SELECT 1 FROM suggested_links
      WHERE (source_memorial_id = rec.x_id AND target_memorial_id = rec.y_id)
        OR (source_memorial_id = rec.y_id AND target_memorial_id = rec.x_id)
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
        FROM memorials m1, memorials m2
        WHERE m1.id = rec.x_id AND m2.id = rec.y_id
      )
    )
    THEN
      INSERT INTO suggested_links (
        source_memorial_id, target_memorial_id, suggested_relation,
        inference_logic, created_by_ai, status
      ) VALUES (
        rec.x_id,
        rec.y_id,
        inferred_label,
        'Transitivité via ' || (
          SELECT first_name || ' ' || last_name FROM memorials WHERE id = rec.p_id
        ) || ' (' || rec.r1_type || ' + ' || rec.r2_type || ')',
        true,
        'pending'
      ) ON CONFLICT ((LEAST(source_memorial_id, target_memorial_id)), (GREATEST(source_memorial_id, target_memorial_id))) DO NOTHING;
    END IF;
  END LOOP;
END;
$function$;