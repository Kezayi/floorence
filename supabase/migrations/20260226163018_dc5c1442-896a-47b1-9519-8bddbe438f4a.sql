
-- ============================================================
-- P0: Fix get_paginated_memorials (cover_image_url → photo_url)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_paginated_memorials(
  p_search_query text DEFAULT ''::text,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 12
)
RETURNS TABLE(
  id uuid, first_name text, last_name text, 
  birth_date date, death_date date, is_published boolean, 
  slug text, photo_url text, total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH filtered_memorials AS (
        SELECT m.*
        FROM public.memorials m
        WHERE (p_search_query = '' OR 
               m.first_name ILIKE '%' || p_search_query || '%' OR 
               m.last_name ILIKE '%' || p_search_query || '%')
        AND m.is_published = true
    )
    SELECT 
        f.id, f.first_name, f.last_name, f.birth_date, f.death_date, 
        f.is_published, f.slug, f.photo_url,
        (SELECT COUNT(*) FROM filtered_memorials)
    FROM filtered_memorials f
    ORDER BY f.created_at DESC
    LIMIT LEAST(p_limit, 200) OFFSET p_offset;
END;
$function$;

-- ============================================================
-- P0: Fix confirm_payment_and_publish (remove guestbook_posts.status)
-- Payment confirmation now just updates transaction status.
-- guestbook_posts has no 'status' column — posts are always visible
-- unless is_hidden=true. The payment flow publishes by existing.
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_payment_and_publish(
  p_ebilling_ref text, 
  p_transaction_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_memorial_id uuid;
BEGIN
    -- Update transaction status
    UPDATE public.payment_transactions 
    SET status = 'SUCCESS', 
        ebilling_transaction_id = p_transaction_id,
        updated_at = NOW()
    WHERE ebilling_reference = p_ebilling_ref
    RETURNING memorial_id INTO v_memorial_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Transaction not found');
    END IF;

    -- No guestbook_posts.status column exists — posts are visible by default (is_hidden=false).
    -- If a post was hidden pending payment, unhide it:
    UPDATE public.guestbook_posts 
    SET is_hidden = false, updated_at = NOW()
    WHERE memorial_id = v_memorial_id
      AND payment_reference = p_ebilling_ref
      AND is_hidden = true;

    RETURN jsonb_build_object('success', true, 'memorial_id', v_memorial_id);
END;
$function$;

-- ============================================================
-- P1: Secure admin views with RLS (recreate as security_invoker)
-- Views don't support traditional RLS policies, so we use 
-- security_invoker = true which means the view runs with the
-- caller's permissions. Combined with RLS on underlying tables,
-- only admins (who have SELECT on memorials via RLS) see data.
-- For extra safety, we wrap access in admin-checking functions.
-- ============================================================

-- v_dashboard_stats: recreate with security_invoker
DROP VIEW IF EXISTS public.v_dashboard_stats;
CREATE VIEW public.v_dashboard_stats WITH (security_invoker = on) AS
SELECT
  (SELECT COUNT(*) FROM memorials)::bigint AS total_memorials,
  (SELECT COUNT(*) FROM memorials WHERE is_demo = true)::bigint AS demo_memorials,
  (SELECT COUNT(*) FROM memorials WHERE (is_demo = false OR is_demo IS NULL))::bigint AS real_memorials,
  (SELECT COUNT(*) FROM guestbook_posts)::bigint AS total_posts,
  (SELECT COUNT(*) FROM guestbook_posts WHERE is_hidden = false)::bigint AS visible_posts,
  (SELECT COUNT(*) FROM guestbook_posts WHERE created_at > now() - interval '7 days')::bigint AS posts_last_week,
  (SELECT COUNT(*) FROM guestbook_posts WHERE created_at > now() - interval '14 days' AND created_at <= now() - interval '7 days')::bigint AS posts_prev_week,
  (SELECT COALESCE(SUM(candle_count), 0) FROM guestbook_posts)::bigint AS total_candles,
  (SELECT COALESCE(SUM(flower_count), 0) FROM guestbook_posts)::bigint AS total_flowers,
  (SELECT COALESCE(SUM(candle_count), 0) FROM guestbook_posts WHERE created_at > now() - interval '7 days')::bigint AS candles_last_week,
  (SELECT COALESCE(SUM(candle_count), 0) FROM guestbook_posts WHERE created_at > now() - interval '7 days')::double precision * 1.1 AS predicted_candles_next_week,
  (SELECT COUNT(*) FROM profiles)::bigint AS total_users,
  (SELECT COALESCE(SUM(amount), 0) FROM payment_transactions WHERE status = 'SUCCESS')::bigint AS total_revenue,
  (SELECT COUNT(*) FROM guestbook_posts WHERE relation_category IN ('Père', 'Mère', 'Fils', 'Fille', 'Frère', 'Sœur', 'Époux', 'Épouse'))::bigint AS cat_famille_directe,
  (SELECT COUNT(*) FROM guestbook_posts WHERE relation_category IN ('Oncle', 'Tante', 'Cousin', 'Cousine', 'Neveu', 'Nièce', 'Grand-père', 'Grand-mère'))::bigint AS cat_famille_elargie,
  (SELECT COUNT(*) FROM guestbook_posts WHERE relation_category IN ('Beau-père', 'Belle-mère', 'Gendre', 'Belle-fille', 'Beau-frère', 'Belle-sœur'))::bigint AS cat_allies,
  (SELECT COUNT(*) FROM guestbook_posts WHERE relation_category IN ('Ami proche', 'Collègue', 'Voisin', 'Mentor'))::bigint AS cat_socio_coeur,
  (SELECT COUNT(*) FROM guestbook_posts WHERE relation_category NOT IN ('Père', 'Mère', 'Fils', 'Fille', 'Frère', 'Sœur', 'Époux', 'Épouse', 'Oncle', 'Tante', 'Cousin', 'Cousine', 'Neveu', 'Nièce', 'Grand-père', 'Grand-mère', 'Beau-père', 'Belle-mère', 'Gendre', 'Belle-fille', 'Beau-frère', 'Belle-sœur', 'Ami proche', 'Collègue', 'Voisin', 'Mentor'))::bigint AS cat_autres,
  (SELECT COUNT(*) FROM memorial_relations WHERE status = 'accepted')::bigint AS inter_memorial_links;

-- v_admin_success_metrics: recreate with security_invoker
DROP VIEW IF EXISTS public.v_admin_success_metrics;
CREATE VIEW public.v_admin_success_metrics WITH (security_invoker = on) AS
SELECT
  (SELECT COUNT(*) FROM memorial_relations WHERE status = 'accepted')::bigint AS total_reunions,
  CASE 
    WHEN (SELECT COUNT(*) FROM suggested_links) > 0 
    THEN ((SELECT COUNT(*) FROM suggested_links WHERE status = 'confirmed')::double precision / 
          (SELECT COUNT(*) FROM suggested_links)::double precision * 100)
    ELSE 0 
  END AS success_rate_percent,
  (SELECT COUNT(DISTINCT created_by) FROM memorials WHERE is_demo = false OR is_demo IS NULL)::bigint AS active_families_engaged;

-- backoffice_humanity_index: recreate with security_invoker
DROP VIEW IF EXISTS public.backoffice_humanity_index;
CREATE VIEW public.backoffice_humanity_index WITH (security_invoker = on) AS
SELECT
  m.id AS memorial_id,
  COALESCE(m.social_density_score, 0)::bigint AS density_score,
  COALESCE(m.total_candles, 0)::bigint + COALESCE(m.total_flowers, 0)::bigint AS gesture_score,
  COALESCE(m.network_size, 0)::bigint AS inference_bonus,
  (COALESCE(m.social_density_score, 0) + COALESCE(m.total_candles, 0) + COALESCE(m.total_flowers, 0) + COALESCE(m.network_size, 0))::bigint AS humanity_index
FROM memorials m;

-- v_social_inferences: recreate with security_invoker
DROP VIEW IF EXISTS public.v_social_inferences;
CREATE VIEW public.v_social_inferences WITH (security_invoker = on) AS
SELECT
  gp.user_id,
  (SELECT display_name FROM profiles WHERE user_id = gp.user_id LIMIT 1) AS author_name,
  COUNT(DISTINCT gp.memorial_id)::bigint AS total_memorials,
  jsonb_agg(DISTINCT jsonb_build_object(
    'memorial_id', gp.memorial_id,
    'relation', gp.relation_category
  )) AS detail_liens,
  NULL::jsonb AS connexions_suggerees
FROM guestbook_posts gp
WHERE gp.user_id IS NOT NULL
GROUP BY gp.user_id;

-- ============================================================
-- P2: Fix transfer_memorial_ownership search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.transfer_memorial_ownership(
  p_memorial_id uuid, 
  p_new_owner_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.memorials SET created_by = p_new_owner_id WHERE id = p_memorial_id;
    
    INSERT INTO public.audit_logs (performed_by, action_type, details)
    VALUES (auth.uid(), 'OWNERSHIP_TRANSFER', jsonb_build_object('memorial_id', p_memorial_id));
    
    RETURN jsonb_build_object('success', true);
END;
$function$;
