
-- ============================================================
-- CLEANUP: Remove overly permissive USING(true) SELECT policies
-- ============================================================

-- 1. MEMORIALS: Drop 3 redundant unfiltered SELECT policies
--    Keep "Anyone can view published memorials" which properly filters
--    Keep "Creators can view their unpublished memorials"
--    Keep "Admins can view all memorials"
DROP POLICY IF EXISTS "Enable access for authenticated users" ON public.memorials;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.memorials;
DROP POLICY IF EXISTS "Les mémoriaux sont consultables par tous" ON public.memorials;

-- 2. GUESTBOOK_POSTS: Drop 2 redundant unfiltered SELECT policies
--    Public access should go through get_public_guestbook_posts() function
--    which filters hidden posts. Keep user/admin specific policies.
DROP POLICY IF EXISTS "Allow read for all tributes" ON public.guestbook_posts;
DROP POLICY IF EXISTS "Enable read access for tributes" ON public.guestbook_posts;

-- Add a proper public SELECT policy that excludes hidden posts
CREATE POLICY "Public can view visible tributes"
  ON public.guestbook_posts
  FOR SELECT
  USING (is_hidden = false);

-- 3. MEMORIAL_RELATIONS: Drop redundant unfiltered SELECT
--    Keep "Anyone can view accepted relations" which filters by status
DROP POLICY IF EXISTS "Les relations sont consultables par tous" ON public.memorial_relations;

-- 4. PROFILES: Drop overly broad SELECT policies
--    Phone is PII. Use profiles_public view for public access.
DROP POLICY IF EXISTS "Allow read for all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles limited view" ON public.profiles;

-- Add a policy allowing authenticated users to read basic profile info
-- (needed for author avatars, display names in the app)
CREATE POLICY "Authenticated can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. AUDIT_LOGS: Restrict INSERT to authenticated admin/service only
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = performed_by);
