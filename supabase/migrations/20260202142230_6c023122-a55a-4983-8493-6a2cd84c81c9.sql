-- Drop the unused can_view_guestbook_post function that always returns true
DROP FUNCTION IF EXISTS public.can_view_guestbook_post(uuid);
