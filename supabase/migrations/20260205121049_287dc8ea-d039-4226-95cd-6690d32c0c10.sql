-- Fix: Add SELECT policy for admins to view all guestbook posts
CREATE POLICY "Admins can view all guestbook posts"
ON public.guestbook_posts
FOR SELECT
USING (is_admin_or_moderator(auth.uid()));

-- Add creator_relation column to memorials table for storing creator's relationship with deceased
ALTER TABLE public.memorials
ADD COLUMN IF NOT EXISTS creator_relation text;