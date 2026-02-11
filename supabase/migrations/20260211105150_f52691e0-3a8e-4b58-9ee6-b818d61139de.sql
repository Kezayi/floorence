
-- Convert v_social_inferences to SECURITY INVOKER
CREATE OR REPLACE VIEW public.v_social_inferences WITH (security_invoker = true) AS
WITH user_memorial_links AS (
  SELECT p.user_id, p.author_name, p.memorial_id, p.relation_group, p.relation_link,
    (m.first_name || ' ' || m.last_name) AS defunt_name, m.slug AS defunt_slug
  FROM guestbook_posts p
  JOIN memorials m ON p.memorial_id = m.id
)
SELECT user_id, author_name,
  count(DISTINCT memorial_id) AS total_memorials,
  jsonb_agg(DISTINCT jsonb_build_object('defunt', defunt_name, 'slug', defunt_slug, 'lien', relation_link, 'categorie', relation_group)) AS detail_liens,
  (SELECT jsonb_agg(DISTINCT p2.author_name) FROM guestbook_posts p2
   WHERE p2.memorial_id IN (SELECT p3.memorial_id FROM guestbook_posts p3 WHERE p3.user_id = user_memorial_links.user_id)
     AND p2.relation_link IN (SELECT p4.relation_link FROM guestbook_posts p4 WHERE p4.user_id = user_memorial_links.user_id)
     AND p2.user_id <> user_memorial_links.user_id) AS connexions_suggerees
FROM user_memorial_links
GROUP BY user_id, author_name;

-- Convert v_admin_success_metrics to SECURITY INVOKER
CREATE OR REPLACE VIEW public.v_admin_success_metrics WITH (security_invoker = true) AS
SELECT
  count(*) FILTER (WHERE status = 'confirmed') AS total_reunions,
  round((count(*) FILTER (WHERE status = 'confirmed'))::double precision / NULLIF(count(*), 0)::double precision * 100) AS success_rate_percent,
  count(DISTINCT source_memorial_id) AS active_families_engaged
FROM suggested_links;

-- Convert v_unified_lineages to SECURITY INVOKER
CREATE OR REPLACE VIEW public.v_unified_lineages WITH (security_invoker = true) AS
SELECT mr.memorial_id_1, mr.memorial_id_2, mr.relation_type,
  (m1.first_name || ' ' || m1.last_name) AS name_1,
  (m2.first_name || ' ' || m2.last_name) AS name_2
FROM memorial_relations mr
JOIN memorials m1 ON mr.memorial_id_1 = m1.id
JOIN memorials m2 ON mr.memorial_id_2 = m2.id
WHERE mr.status = 'accepted';
