
DROP FUNCTION IF EXISTS public.get_public_guestbook_posts(uuid);

CREATE OR REPLACE FUNCTION public.get_public_guestbook_posts(p_memorial_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, memorial_id uuid, user_id uuid, author_name text, relation_category text, relation_link text, content text, photos text[], candle_count integer, flower_count integer, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    gp.id,
    gp.memorial_id,
    gp.user_id,
    gp.author_name,
    gp.relation_category,
    gp.relation_link,
    gp.content,
    gp.photos,
    gp.candle_count,
    gp.flower_count,
    gp.created_at,
    gp.updated_at
  FROM public.guestbook_posts gp
  WHERE (p_memorial_id IS NULL OR gp.memorial_id = p_memorial_id)
    AND gp.is_hidden = false
  ORDER BY gp.created_at DESC
$function$;
