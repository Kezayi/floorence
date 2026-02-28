
-- ============================================================
-- SECURITY PATCH: Views, Functions, Storage
-- ============================================================

-- 1. SECURE VIEWS
ALTER VIEW public.v_social_inferences SET (security_invoker = true);
ALTER VIEW public.backoffice_humanity_index SET (security_invoker = true);
ALTER VIEW public.v_unified_lineages SET (security_invoker = true);
ALTER VIEW public.v_admin_success_metrics SET (security_invoker = true);
ALTER VIEW public.profiles_public SET (security_invoker = true);
ALTER VIEW public.public_guestbook SET (security_invoker = true);

-- 2. DROP overpermissive profiles policy
DROP POLICY IF EXISTS "Anyone can view display names" ON public.profiles;

-- 3. HARDEN admin SECURITY DEFINER functions

CREATE OR REPLACE FUNCTION public.admin_force_validate_all_suggestions()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    rows_affected int;
BEGIN
    IF NOT has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Accès refusé : rôle admin requis';
    END IF;

    INSERT INTO public.memorial_relations (memorial_id_1, memorial_id_2, relation_type, status)
    SELECT source_memorial_id, target_memorial_id, suggested_relation, 'accepted'
    FROM public.suggested_links
    WHERE status = 'pending'
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    UPDATE public.suggested_links
    SET status = 'confirmed', notified_admin = true
    WHERE status = 'pending';

    RETURN json_build_object('status', 'success', 'message', rows_affected || ' liens fusionnés.', 'count', rows_affected);
END;
$function$;

CREATE OR REPLACE FUNCTION public.transfer_memorial_ownership(p_memorial_id uuid, p_new_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Accès refusé : rôle admin requis';
    END IF;

    UPDATE public.memorials SET created_by = p_new_owner_id WHERE id = p_memorial_id;
    INSERT INTO public.audit_logs (performed_by, action_type, details)
    VALUES (auth.uid(), 'OWNERSHIP_TRANSFER', jsonb_build_object('memorial_id', p_memorial_id));
    RETURN jsonb_build_object('success', true);
END;
$function$;

-- 4. Switch get_memorial_gesture_stats to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_memorial_gesture_stats(p_memorial_ids uuid[])
 RETURNS TABLE(memorial_id uuid, post_count bigint, total_candles bigint, total_flowers bigint)
 LANGUAGE plpgsql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT gp.memorial_id, COUNT(*)::bigint, COALESCE(SUM(gp.candle_count), 0)::bigint, COALESCE(SUM(gp.flower_count), 0)::bigint
  FROM public.guestbook_posts gp
  WHERE gp.memorial_id = ANY(p_memorial_ids) AND gp.is_hidden = false
  GROUP BY gp.memorial_id;
END;
$function$;

-- 5. STORAGE: bucket config
UPDATE storage.buckets SET file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'] WHERE id = 'memorial-photos';
UPDATE storage.buckets SET file_size_limit = 2097152, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'] WHERE id = 'avatars';

-- 6. STORAGE POLICIES (with explicit text cast for owner_id)
DROP POLICY IF EXISTS "memorial-photos: public read" ON storage.objects;
DROP POLICY IF EXISTS "memorial-photos: auth upload" ON storage.objects;
DROP POLICY IF EXISTS "memorial-photos: owner/admin update" ON storage.objects;
DROP POLICY IF EXISTS "memorial-photos: owner/admin delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;
DROP POLICY IF EXISTS "avatars: auth upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars: owner/admin delete" ON storage.objects;

CREATE POLICY "memorial-photos: public read" ON storage.objects FOR SELECT USING (bucket_id = 'memorial-photos');
CREATE POLICY "memorial-photos: auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'memorial-photos');
CREATE POLICY "memorial-photos: owner/admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'memorial-photos' AND (auth.uid()::text = owner_id OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "memorial-photos: owner/admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'memorial-photos' AND (auth.uid()::text = owner_id OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "avatars: public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars: auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "avatars: owner/admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (auth.uid()::text = owner_id OR has_role(auth.uid(), 'admin'::app_role)));
