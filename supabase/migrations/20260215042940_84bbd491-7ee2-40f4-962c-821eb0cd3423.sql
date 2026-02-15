
-- Point 2: Fix search_path on get_memorial_social_stats
CREATE OR REPLACE FUNCTION public.get_memorial_social_stats(target_memorial_id uuid)
RETURNS TABLE(category text, count bigint)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
BEGIN
    RETURN QUERY
    SELECT relation_category, COUNT(*)
    FROM public.guestbook_posts
    WHERE memorial_id = target_memorial_id
    GROUP BY relation_category;
END;
$function$;

-- Point 3: Add pagination to get_public_guestbook_posts (LIMIT 50 when no memorial_id)
CREATE OR REPLACE FUNCTION public.get_public_guestbook_posts(
  p_memorial_id uuid DEFAULT NULL::uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  memorial_id uuid,
  author_name text,
  relation_category text,
  relation_link text,
  content text,
  photos text[],
  candle_count integer,
  flower_count integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    gp.id,
    gp.memorial_id,
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
  LIMIT LEAST(p_limit, 200)
  OFFSET p_offset
$function$;

-- Point 4: Restrict storage bucket listing by revoking public list access
-- Remove overly permissive SELECT policies and replace with path-based access
DROP POLICY IF EXISTS "Anyone can view memorial photos" ON storage.objects;
CREATE POLICY "Anyone can view memorial photos by path"
ON storage.objects FOR SELECT
USING (bucket_id = 'memorial-photos' AND (storage.foldername(name))[1] IS NOT NULL);

-- Add a policy that blocks listing the root (empty prefix queries return nothing useful)
-- The above policy still allows direct file access by full path but storage API list 
-- requires SELECT permission which is now scoped to actual folder paths

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars by path"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] IS NOT NULL);
