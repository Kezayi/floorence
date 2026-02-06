
-- Fix guestbook_posts RLS: All policies are RESTRICTIVE which blocks everything
-- Need to recreate them as PERMISSIVE (default)

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own posts with full details" ON public.guestbook_posts;
DROP POLICY IF EXISTS "Anon cannot directly access guestbook posts" ON public.guestbook_posts;
DROP POLICY IF EXISTS "Admins can view all guestbook posts" ON public.guestbook_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.guestbook_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.guestbook_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.guestbook_posts;
DROP POLICY IF EXISTS "Admins and mods can moderate posts" ON public.guestbook_posts;
DROP POLICY IF EXISTS "Admins can delete guestbook posts" ON public.guestbook_posts;

-- Recreate ALL policies as PERMISSIVE (default)

-- SELECT: Users can see their own posts
CREATE POLICY "Users can view their own posts"
ON public.guestbook_posts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- SELECT: Admins/mods can see ALL posts for moderation
CREATE POLICY "Admins can view all guestbook posts"
ON public.guestbook_posts FOR SELECT
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

-- INSERT: Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
ON public.guestbook_posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own posts
CREATE POLICY "Users can update their own posts"
ON public.guestbook_posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Admins/mods can moderate (update) any post
CREATE POLICY "Admins and mods can moderate posts"
ON public.guestbook_posts FOR UPDATE
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()))
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

-- DELETE: Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
ON public.guestbook_posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- DELETE: Admins can delete any post
CREATE POLICY "Admins can delete guestbook posts"
ON public.guestbook_posts FOR DELETE
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()));

-- BLOCK: Anonymous users cannot access at all (this one targets anon role specifically)
CREATE POLICY "Anon cannot access guestbook posts"
ON public.guestbook_posts FOR ALL
TO anon
USING (false)
WITH CHECK (false);
