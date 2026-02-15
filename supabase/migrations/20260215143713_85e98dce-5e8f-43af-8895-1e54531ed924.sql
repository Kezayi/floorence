
-- Drop the OLD overload (single param) that conflicts with the new one
DROP FUNCTION IF EXISTS public.get_public_guestbook_posts(p_memorial_id uuid);
