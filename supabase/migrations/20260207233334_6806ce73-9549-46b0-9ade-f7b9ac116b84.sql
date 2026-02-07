-- Fix category distribution to match actual relation_group values (uppercase)
DROP VIEW IF EXISTS public.v_dashboard_stats;

CREATE VIEW public.v_dashboard_stats AS
WITH
  memorial_counts AS (
    SELECT
      COUNT(*) AS total_memorials,
      COUNT(*) FILTER (WHERE is_demo = true) AS demo_memorials,
      COUNT(*) FILTER (WHERE is_demo IS DISTINCT FROM true) AS real_memorials
    FROM public.memorials
    WHERE merged_into IS NULL
  ),
  post_counts AS (
    SELECT
      COUNT(*) AS total_posts,
      COUNT(*) FILTER (WHERE is_hidden = false) AS visible_posts,
      COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') AS posts_last_week,
      COUNT(*) FILTER (WHERE created_at > now() - interval '14 days' AND created_at <= now() - interval '7 days') AS posts_prev_week,
      COALESCE(SUM(candle_count), 0) AS total_candles,
      COALESCE(SUM(flower_count), 0) AS total_flowers,
      COALESCE(SUM(candle_count) FILTER (WHERE created_at > now() - interval '7 days'), 0) AS candles_last_week
    FROM public.guestbook_posts
  ),
  user_counts AS (
    SELECT COUNT(*) AS total_users
    FROM public.profiles
  ),
  revenue AS (
    SELECT COALESCE(SUM(amount), 0) AS total_revenue
    FROM public.payment_transactions
    WHERE status = 'completed'
  ),
  category_distribution AS (
    SELECT
      COUNT(*) FILTER (WHERE UPPER(relation_group) = 'FAMILLE DIRECTE') AS cat_famille_directe,
      COUNT(*) FILTER (WHERE UPPER(relation_group) = 'FAMILLE ELARGIE') AS cat_famille_elargie,
      COUNT(*) FILTER (WHERE UPPER(relation_group) = 'ALLIES') AS cat_allies,
      COUNT(*) FILTER (WHERE UPPER(relation_group) = 'SOCIO COEUR') AS cat_socio_coeur,
      COUNT(*) FILTER (WHERE UPPER(relation_group) NOT IN ('FAMILLE DIRECTE', 'FAMILLE ELARGIE', 'ALLIES', 'SOCIO COEUR') OR relation_group IS NULL) AS cat_autres
    FROM public.guestbook_posts
    WHERE is_hidden = false
  )
SELECT
  mc.total_memorials,
  mc.demo_memorials,
  mc.real_memorials,
  pc.total_posts,
  pc.visible_posts,
  pc.posts_last_week,
  pc.posts_prev_week,
  pc.total_candles,
  pc.total_flowers,
  pc.candles_last_week,
  CASE
    WHEN pc.posts_prev_week > 0 THEN
      ROUND(pc.candles_last_week * (1.0 + (pc.posts_last_week - pc.posts_prev_week)::float / GREATEST(pc.posts_prev_week, 1) * 0.5))
    ELSE
      ROUND(pc.candles_last_week * 1.15)
  END AS predicted_candles_next_week,
  uc.total_users,
  rv.total_revenue,
  cd.cat_famille_directe,
  cd.cat_famille_elargie,
  cd.cat_allies,
  cd.cat_socio_coeur,
  cd.cat_autres
FROM memorial_counts mc
CROSS JOIN post_counts pc
CROSS JOIN user_counts uc
CROSS JOIN revenue rv
CROSS JOIN category_distribution cd;