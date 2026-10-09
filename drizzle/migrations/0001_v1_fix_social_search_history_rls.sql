BEGIN;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.social_search_history;
DROP POLICY IF EXISTS "Users can view their own history" ON public.social_search_history;
DROP POLICY IF EXISTS "Admins can insert own search history" ON public.social_search_history;

CREATE POLICY "Admins can insert own search history"
ON public.social_search_history
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_moderator(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Admins can delete search history"
ON public.social_search_history
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

COMMIT;