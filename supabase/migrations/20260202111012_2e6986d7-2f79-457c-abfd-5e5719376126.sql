-- Drop the conflicting/permissive policy
DROP POLICY IF EXISTS "Authenticated can view posts for memorial display" ON public.guestbook_posts;

-- Drop the old view
DROP VIEW IF EXISTS public.guestbook_posts_public;

-- Create a security definer function to get public guestbook posts
-- This function safely returns posts without payment_reference
CREATE OR REPLACE FUNCTION public.get_public_guestbook_posts(p_memorial_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  memorial_id uuid,
  user_id uuid,
  author_name text,
  relation_category text,
  content text,
  photos text[],
  candle_count integer,
  flower_count integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    gp.id,
    gp.memorial_id,
    gp.user_id,
    gp.author_name,
    gp.relation_category,
    gp.content,
    gp.photos,
    gp.candle_count,
    gp.flower_count,
    gp.created_at,
    gp.updated_at
  FROM public.guestbook_posts gp
  WHERE (p_memorial_id IS NULL OR gp.memorial_id = p_memorial_id)
  ORDER BY gp.created_at DESC
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_public_guestbook_posts(uuid) TO anon, authenticated;