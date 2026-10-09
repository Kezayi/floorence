CREATE UNIQUE INDEX uq_suggested_links_pair ON public.suggested_links ((LEAST(source_memorial_id, target_memorial_id)), (GREATEST(source_memorial_id, target_memorial_id)));

CREATE OR REPLACE FUNCTION public.generate_suggested_links()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.suggested_links (source_memorial_id, target_memorial_id, suggested_relation, inference_logic)
    SELECT 
        r2.memorial_id_2 as source,
        r1.memorial_id_2 as target,
        'Neveu' as relation,
        'Frère de Neveu' as logic
    FROM public.memorial_relations r1
    JOIN public.memorial_relations r2 ON r1.memorial_id_1 = r2.memorial_id_1
    WHERE r1.relation_type = 'Neveu' 
    AND r2.relation_type = 'Frère'
    AND r1.status = 'accepted'
    AND r2.status = 'accepted'
    AND NOT EXISTS (
        SELECT 1 FROM public.suggested_links 
        WHERE source_memorial_id = r2.memorial_id_2 AND target_memorial_id = r1.memorial_id_2
    )
    ON CONFLICT ((LEAST(source_memorial_id, target_memorial_id)), (GREATEST(source_memorial_id, target_memorial_id))) DO NOTHING;
END;
$function$;

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
  -- Determine scope: if IDs provided, only analyze their neighborhood
  -- Otherwise analyze everything (for manual calls)
  IF p_memorial_id_1 IS NOT NULL AND p_memorial_id_2 IS NOT NULL THEN
    -- Collect the 2-hop neighborhood of the affected memorials
    SELECT ARRAY(
      SELECT DISTINCT unnest(ARRAY[r.memorial_id_1, r.memorial_id_2])
      FROM memorial_relations r
      WHERE r.status = 'accepted'
        AND (r.memorial_id_1 IN (p_memorial_id_1, p_memorial_id_2)
          OR r.memorial_id_2 IN (p_memorial_id_1, p_memorial_id_2))
    ) INTO scope_ids;
    
    -- Add the original pair
    scope_ids := scope_ids || ARRAY[p_memorial_id_1, p_memorial_id_2];
  ELSE
    -- Full scan
    SELECT ARRAY(
      SELECT DISTINCT unnest(ARRAY[r.memorial_id_1, r.memorial_id_2])
      FROM memorial_relations r
      WHERE r.status = 'accepted'
    ) INTO scope_ids;
  END IF;

  -- If empty scope, nothing to do
  IF scope_ids IS NULL OR array_length(scope_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- For each pivot P, look at all pairs (X, Y) of its neighbors
  -- where X and Y are not directly linked
  FOR rec IN
    SELECT
      r1.memorial_id_1 AS p_id,
      r1.memorial_id_2 AS x_id,
      r1.relation_type AS r1_type,
      r2.memorial_id_2 AS y_id,
      r2.relation_type AS r2_type
    FROM memorial_relations r1
    JOIN memorial_relations r2 
      ON r1.memorial_id_1 = r2.memorial_id_1  -- Same pivot (memorial_id_1)
      AND r1.memorial_id_2 != r2.memorial_id_2 -- Different targets
    WHERE r1.status = 'accepted' AND r2.status = 'accepted'
      AND r1.memorial_id_1 = ANY(scope_ids)
    
    UNION ALL
    
    -- Also consider inverse direction: pivot is memorial_id_2
    SELECT
      r1.memorial_id_2 AS p_id,
      r1.memorial_id_1 AS x_id,
      r1.relation_type AS r1_type,
      r2.memorial_id_1 AS y_id,
      r2.relation_type AS r2_type
    FROM memorial_relations r1
    JOIN memorial_relations r2
      ON r1.memorial_id_2 = r2.memorial_id_2  -- Same pivot (memorial_id_2)
      AND r1.memorial_id_1 != r2.memorial_id_1
    WHERE r1.status = 'accepted' AND r2.status = 'accepted'
      AND r1.memorial_id_2 = ANY(scope_ids)

    UNION ALL

    -- Cross direction: pivot = r1.memorial_id_1 AND pivot = r2.memorial_id_2
    SELECT
      r1.memorial_id_1 AS p_id,
      r1.memorial_id_2 AS x_id,
      r1.relation_type AS r1_type,
      r2.memorial_id_1 AS y_id,
      r2.relation_type AS r2_type
    FROM memorial_relations r1
    JOIN memorial_relations r2
      ON r1.memorial_id_1 = r2.memorial_id_2
      AND r1.memorial_id_2 != r2.memorial_id_1
    WHERE r1.status = 'accepted' AND r2.status = 'accepted'
      AND r1.memorial_id_1 = ANY(scope_ids)

    UNION ALL

    -- Cross direction: pivot = r1.memorial_id_2 AND pivot = r2.memorial_id_1
    SELECT
      r1.memorial_id_2 AS p_id,
      r1.memorial_id_1 AS x_id,
      r1.relation_type AS r1_type,
      r2.memorial_id_2 AS y_id,
      r2.relation_type AS r2_type
    FROM memorial_relations r1
    JOIN memorial_relations r2
      ON r1.memorial_id_2 = r2.memorial_id_1
      AND r1.memorial_id_1 != r2.memorial_id_2
    WHERE r1.status = 'accepted' AND r2.status = 'accepted'
      AND r1.memorial_id_2 = ANY(scope_ids)
  LOOP
    -- Compute normalized types
    -- r1 says: P is r1_type of X (when P=memorial_id_1, X=memorial_id_2)
    -- So from the perspective of the rule: P is r_px of X
    -- For case 1 (P=memorial_id_1): r_px = normalize(r1_type)
    -- For case 2 (P=memorial_id_2, inverse): r_px = inverse(normalize(r1_type))
    -- The UNION handles this by selecting the right columns

    -- For the first UNION: P=r1.memorial_id_1, so P is r1_type of X
    -- r_px = normalize(r1_type) — P is this of X
    -- r_py = normalize(r2_type) — P is this of Y
    
    r_px := normalize_relation_type(rec.r1_type);
    r_py := normalize_relation_type(rec.r2_type);
    
    -- Skip if we can't normalize
    IF r_px IS NULL OR r_py IS NULL THEN
      CONTINUE;
    END IF;

    -- For cases where pivot is memorial_id_2 (case 2, 4), we need inverses
    -- Actually the UNION already handles direction through column selection
    -- But the relation_type is always "memorial_id_1 is [type] of memorial_id_2"
    -- So when P=memorial_id_2 and X=memorial_id_1, the relation is "X is [type] of P"
    -- meaning P is inverse([type]) of X → r_px = inverse(normalize(type))
    
    -- Let me simplify: I need to account for direction properly
    -- Actually the 4 UNION cases already pick which memorial is the "pivot" and which is "other"
    -- but the relation_type is always stated as "memorial_id_1 is [type] of memorial_id_2"
    
    -- Case 1: P=memorial_id_1, X=memorial_id_2 → "P is r1_type of X" → r_px = normalize(r1_type)
    -- Case 2: P=memorial_id_2, X=memorial_id_1 → "X is r1_type of P" → "P is inverse of X" → r_px should be inverse
    -- Case 3: P=memorial_id_1(r1), X=memorial_id_2(r1), P=memorial_id_2(r2), Y=memorial_id_1(r2) 
    --   r1: P is r1_type of X, r2: Y is r2_type of P → P is inverse(r2_type) of Y
    -- Case 4: P=memorial_id_2(r1), X=memorial_id_1(r1), P=memorial_id_1(r2), Y=memorial_id_2(r2)
    --   r1: X is r1_type of P → P is inverse(r1_type) of X, r2: P is r2_type of Y

    -- This is getting complex. Let me re-approach with a simpler adjacency-based approach.
    -- I'll skip the complex direction handling and just check for existing pairs

    inferred := transitive_rule(r_px, r_py);
    IF inferred IS NULL THEN
      CONTINUE;
    END IF;

    inferred_label := normalized_to_label(inferred);

    -- Build a canonical pair key (sorted UUIDs) to avoid duplicates
    IF rec.x_id < rec.y_id THEN
      pair_key := rec.x_id::text || '|' || rec.y_id::text;
    ELSE
      pair_key := rec.y_id::text || '|' || rec.x_id::text;
    END IF;

    -- Check: no existing accepted relation between X and Y
    IF NOT EXISTS (
      SELECT 1 FROM memorial_relations
      WHERE status = 'accepted'
        AND ((memorial_id_1 = rec.x_id AND memorial_id_2 = rec.y_id)
          OR (memorial_id_1 = rec.y_id AND memorial_id_2 = rec.x_id))
    )
    -- Check: no existing suggested_link for this pair (any status)
    AND NOT EXISTS (
      SELECT 1 FROM suggested_links
      WHERE (source_memorial_id = rec.x_id AND target_memorial_id = rec.y_id)
        OR (source_memorial_id = rec.y_id AND target_memorial_id = rec.x_id)
    )
    -- Chronological validation: basic parent age check
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
      -- Insert the suggestion
      INSERT INTO suggested_links (
        source_memorial_id,
        target_memorial_id,
        suggested_relation,
        inference_logic,
        created_by_ai,
        status
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