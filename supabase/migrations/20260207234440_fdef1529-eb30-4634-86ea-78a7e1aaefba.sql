
-- Recreate v_dashboard_stats with inter_memorial_links count (Humanity Index)
CREATE OR REPLACE VIEW public.v_dashboard_stats AS
SELECT
  -- Memorial counts
  COUNT(DISTINCT m.id) AS total_memorials,
  COUNT(DISTINCT m.id) FILTER (WHERE m.is_demo = true) AS demo_memorials,
  COUNT(DISTINCT m.id) FILTER (WHERE m.is_demo = false OR m.is_demo IS NULL) AS real_memorials,

  -- Posts counts
  (SELECT COUNT(*) FROM public.guestbook_posts) AS total_posts,
  (SELECT COUNT(*) FROM public.guestbook_posts WHERE is_hidden = false) AS visible_posts,
  (SELECT COUNT(*) FROM public.guestbook_posts WHERE created_at >= now() - interval '7 days') AS posts_last_week,
  (SELECT COUNT(*) FROM public.guestbook_posts WHERE created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days') AS posts_prev_week,

  -- Gesture counts
  (SELECT COALESCE(SUM(candle_count), 0) FROM public.guestbook_posts WHERE is_hidden = false) AS total_candles,
  (SELECT COALESCE(SUM(flower_count), 0) FROM public.guestbook_posts WHERE is_hidden = false) AS total_flowers,
  (SELECT COALESCE(SUM(candle_count), 0) FROM public.guestbook_posts WHERE is_hidden = false AND created_at >= now() - interval '7 days') AS candles_last_week,

  -- Prediction (15% growth)
  ROUND(
    (SELECT COALESCE(SUM(candle_count), 0) FROM public.guestbook_posts WHERE is_hidden = false AND created_at >= now() - interval '7 days')::numeric * 1.15
  )::double precision AS predicted_candles_next_week,

  -- Users
  (SELECT COUNT(*) FROM auth.users) AS total_users,

  -- Revenue
  (SELECT COALESCE(SUM(amount), 0) FROM public.payment_transactions WHERE status = 'completed') AS total_revenue,

  -- Social categories
  (SELECT COUNT(*) FROM public.guestbook_posts WHERE is_hidden = false AND UPPER(relation_group) = 'FAMILLE DIRECTE') AS cat_famille_directe,
  (SELECT COUNT(*) FROM public.guestbook_posts WHERE is_hidden = false AND UPPER(relation_group) = 'FAMILLE ELARGIE') AS cat_famille_elargie,
  (SELECT COUNT(*) FROM public.guestbook_posts WHERE is_hidden = false AND UPPER(relation_group) = 'ALLIES') AS cat_allies,
  (SELECT COUNT(*) FROM public.guestbook_posts WHERE is_hidden = false AND UPPER(relation_group) = 'SOCIO COEUR') AS cat_socio_coeur,
  (SELECT COUNT(*) FROM public.guestbook_posts WHERE is_hidden = false AND UPPER(relation_group) NOT IN ('FAMILLE DIRECTE', 'FAMILLE ELARGIE', 'ALLIES', 'SOCIO COEUR')) AS cat_autres,

  -- Humanity Index: count of inter-memorial relations
  (SELECT COUNT(*) FROM public.memorial_relations) AS inter_memorial_links

FROM public.memorials m
WHERE m.is_active = true;
