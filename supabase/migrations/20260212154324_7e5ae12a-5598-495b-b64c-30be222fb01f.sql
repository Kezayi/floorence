
CREATE OR REPLACE VIEW public.v_dashboard_stats
WITH (security_invoker = on)
AS
SELECT count(DISTINCT m.id) AS total_memorials,
    count(DISTINCT m.id) FILTER (WHERE m.is_demo = true) AS demo_memorials,
    count(DISTINCT m.id) FILTER (WHERE m.is_demo = false OR m.is_demo IS NULL) AS real_memorials,
    (SELECT count(*) FROM guestbook_posts) AS total_posts,
    (SELECT count(*) FROM guestbook_posts WHERE is_hidden = false) AS visible_posts,
    (SELECT count(*) FROM guestbook_posts WHERE created_at >= now() - interval '7 days') AS posts_last_week,
    (SELECT count(*) FROM guestbook_posts WHERE created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days') AS posts_prev_week,
    (SELECT COALESCE(sum(candle_count), 0) FROM guestbook_posts WHERE is_hidden = false) AS total_candles,
    (SELECT COALESCE(sum(flower_count), 0) FROM guestbook_posts WHERE is_hidden = false) AS total_flowers,
    (SELECT COALESCE(sum(candle_count), 0) FROM guestbook_posts WHERE is_hidden = false AND created_at >= now() - interval '7 days') AS candles_last_week,
    round((SELECT COALESCE(sum(candle_count), 0) FROM guestbook_posts WHERE is_hidden = false AND created_at >= now() - interval '7 days')::numeric * 1.15)::double precision AS predicted_candles_next_week,
    (SELECT count(*) FROM profiles) AS total_users,
    (SELECT COALESCE(sum(amount), 0) FROM payment_transactions WHERE status = 'completed') AS total_revenue,
    (SELECT count(*) FROM guestbook_posts WHERE is_hidden = false AND relation_category IN ('famille_directe', 'family')) AS cat_famille_directe,
    (SELECT count(*) FROM guestbook_posts WHERE is_hidden = false AND relation_category = 'famille_elargie') AS cat_famille_elargie,
    (SELECT count(*) FROM guestbook_posts WHERE is_hidden = false AND relation_category = 'allies') AS cat_allies,
    (SELECT count(*) FROM guestbook_posts WHERE is_hidden = false AND relation_category = 'socio_coeur') AS cat_socio_coeur,
    (SELECT count(*) FROM guestbook_posts WHERE is_hidden = false AND relation_category NOT IN ('famille_directe', 'family', 'famille_elargie', 'allies', 'socio_coeur')) AS cat_autres,
    (SELECT count(*) FROM memorial_relations) AS inter_memorial_links
FROM memorials m
WHERE m.is_active = true;
