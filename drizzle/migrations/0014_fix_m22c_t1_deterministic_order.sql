CREATE OR REPLACE FUNCTION public.get_public_guestbook_posts(p_memorial_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, memorial_id uuid, author_name text, relation_category text, relation_link text, content text, photos text[], candle_count integer, flower_count integer, created_at timestamp with time zone, updated_at timestamp with time zone, author_photo_url text, user_id uuid)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT gp.id, gp.memorial_id, gp.author_name, gp.relation_category, gp.relation_link,
         gp.content, gp.photos, gp.candle_count, gp.flower_count, gp.created_at,
         gp.updated_at, gp.author_photo_url, gp.user_id
  FROM public.guestbook_posts gp
  WHERE (p_memorial_id IS NULL OR gp.memorial_id = p_memorial_id)
    AND gp.is_hidden = false
    AND gp.deleted_at IS NULL
  ORDER BY gp.created_at DESC, gp.id DESC
  LIMIT LEAST(p_limit, 200)
  OFFSET p_offset
$function$;
CREATE OR REPLACE FUNCTION public.get_public_guestbook_posts_consolidated(p_master_id uuid, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
RETURNS TABLE(id uuid, memorial_id uuid, author_name text, relation_category text, relation_link text, content text, photos text[], candle_count integer, flower_count integer, created_at timestamp with time zone, updated_at timestamp with time zone, author_photo_url text, user_id uuid)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$
  SELECT gp.id, gp.memorial_id, gp.author_name, gp.relation_category, gp.relation_link,
         gp.content, gp.photos, gp.candle_count, gp.flower_count, gp.created_at,
         gp.updated_at, gp.author_photo_url, gp.user_id
  FROM public.guestbook_posts gp
  WHERE gp.memorial_id IN (SELECT f FROM public.get_memorial_family_ids(p_master_id) f)
    AND gp.is_hidden = false
    AND gp.deleted_at IS NULL
  ORDER BY gp.created_at DESC, gp.id DESC
  LIMIT LEAST(p_limit, 200)
  OFFSET p_offset
$$;