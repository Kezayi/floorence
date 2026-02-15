
-- Fix: public_guestbook view is SECURITY DEFINER, should be SECURITY INVOKER
-- Recreate with security_invoker=on to enforce caller's RLS
DROP VIEW IF EXISTS public.public_guestbook;

CREATE VIEW public.public_guestbook
WITH (security_invoker=on) AS
SELECT id, memorial_id, author_name, author_photo_url, content, created_at, relation_category, relation_link
FROM public.guestbook_posts;
