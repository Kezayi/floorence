DROP POLICY IF EXISTS "Allow authenticated read access" ON public.memorials;
DROP POLICY IF EXISTS "Creators can view their unpublished memorials" ON public.memorials;
DROP POLICY IF EXISTS "Owners and digital heirs can view their memorials" ON public.memorials;
CREATE POLICY "Owners and digital heirs can view their memorials" ON public.memorials FOR SELECT TO authenticated USING ((created_by = auth.uid() OR heir_user_id = auth.uid()) AND deleted_at IS NULL);