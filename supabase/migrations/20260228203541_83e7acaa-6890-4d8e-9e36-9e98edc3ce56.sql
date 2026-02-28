
-- ============================================================
-- SECURITY PATCH FINAL: View, search_path, heir_email masking
-- ============================================================

-- 1. FIX search_path on 4 SECURITY DEFINER functions missing it

ALTER FUNCTION public.check_guestbook_rate_limit() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.resolve_memorial_heir() SET search_path = public;
ALTER FUNCTION public.fn_resolve_memorial_heir_v2() SET search_path = public;

-- 2. CREATE v_public_memorials view hiding sensitive columns
-- This view exposes only public-safe columns for anonymous/public queries

CREATE OR REPLACE VIEW public.v_public_memorials
WITH (security_invoker = true) AS
SELECT
  id, slug, first_name, last_name, birth_date, death_date,
  photo_url, biography, photos, default_photo_index,
  created_by, creator_relation,
  funeral_date, funeral_location, donation_enabled,
  legacy_slug, is_demo, share_token, is_published, is_active,
  total_flowers, total_candles, total_posts,
  social_density_score, network_size, merged_into,
  notification_frequency, notification_start_day, notification_end_day,
  created_at, updated_at
FROM public.memorials;
-- NOTE: heir_email, heir_user_id, contributions_disabled_at are intentionally excluded
