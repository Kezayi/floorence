-- Allow admins to delete memorials
CREATE POLICY "Admins can delete memorials"
ON public.memorials
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to delete guestbook posts
CREATE POLICY "Admins can delete guestbook posts"
ON public.guestbook_posts
FOR DELETE
USING (is_admin_or_moderator(auth.uid()));

-- Allow admins to delete memorial events
CREATE POLICY "Admins can delete memorial events"
ON public.memorial_events
FOR DELETE
USING (has_role(auth.uid(), 'admin'));