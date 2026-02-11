
-- Fix replace_demo_memorial: add search_path
CREATE OR REPLACE FUNCTION public.replace_demo_memorial()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.is_demo = false OR NEW.is_demo IS NULL) THEN
    DELETE FROM public.memorials
    WHERE id = (
      SELECT id FROM public.memorials 
      WHERE is_demo = true 
      ORDER BY created_at ASC 
      LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix generate_suggested_links (no params): add search_path
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
    );
END;
$function$;

-- Fix admin_force_validate_all_suggestions: add search_path
CREATE OR REPLACE FUNCTION public.admin_force_validate_all_suggestions()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    rows_affected int;
BEGIN
    INSERT INTO public.memorial_relations (memorial_id_1, memorial_id_2, relation_type, status)
    SELECT 
        source_memorial_id, 
        target_memorial_id, 
        suggested_relation, 
        'accepted'
    FROM public.suggested_links
    WHERE status = 'pending'
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    UPDATE public.suggested_links
    SET status = 'confirmed',
        notified_admin = true
    WHERE status = 'pending';

    RETURN json_build_object(
        'status', 'success',
        'message', rows_affected || ' liens ont été fusionnés avec succès.',
        'count', rows_affected
    );
END;
$function$;
