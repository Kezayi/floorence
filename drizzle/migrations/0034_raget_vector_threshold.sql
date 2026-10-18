CREATE OR REPLACE FUNCTION public.rag_hybrid_search(p_query text, p_limit integer DEFAULT 10, p_source_types text[] DEFAULT NULL::text[], p_memorial_id uuid DEFAULT NULL::uuid, p_query_embedding vector DEFAULT NULL::vector)
 RETURNS TABLE(chunk_id uuid, source_type text, source_id uuid, memorial_id uuid, canonical_memorial_id uuid, memorial_name text, memorial_slug text, title text, content text, rrf_score double precision, fts_rank integer, trgm_rank integer, vec_rank integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE lim integer := least(greatest(coalesce(p_limit,10),1),50); q text := rag_norm(p_query);
BEGIN
  IF NOT is_admin_or_moderator(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501'; END IF;
  IF length(trim(coalesce(p_query,''))) < 2 THEN RETURN; END IF;
  RETURN QUERY
  WITH visible AS (
    SELECT c.* FROM rag_chunks c JOIN memorials m ON m.id = c.memorial_id
    WHERE m.deleted_at IS NULL AND m.is_active AND m.is_published
      AND (p_source_types IS NULL OR c.source_type = ANY(p_source_types))
      AND (p_memorial_id IS NULL OR c.memorial_id = p_memorial_id OR c.canonical_memorial_id = p_memorial_id)
      AND (c.source_type <> 'tribute' OR EXISTS (SELECT 1 FROM guestbook_posts g WHERE g.id = c.source_id AND NOT g.is_hidden AND g.deleted_at IS NULL))
  ),
  f AS (SELECT v.id, (row_number() OVER (ORDER BY ts_rank_cd(v.fts, websearch_to_tsquery('french', p_query)) DESC))::int r
        FROM visible v WHERE v.fts @@ websearch_to_tsquery('french', p_query) LIMIT 50),
  t AS (SELECT v.id, (row_number() OVER (ORDER BY word_similarity(q, v.norm) DESC))::int r
        FROM visible v WHERE q <% v.norm LIMIT 50),
  e AS (SELECT v.id, (row_number() OVER (ORDER BY v.embedding <=> p_query_embedding))::int r
        FROM visible v WHERE p_query_embedding IS NOT NULL AND v.embedding IS NOT NULL
          AND (v.embedding <=> p_query_embedding) <= 0.185
        ORDER BY v.embedding <=> p_query_embedding LIMIT 20),
  fused AS (
    SELECT coalesce(f.id, t.id, e.id) id, f.r fr, t.r tr, e.r er,
      coalesce(1.0/(60+f.r),0) + coalesce(1.0/(60+t.r),0) + coalesce(1.0/(60+e.r),0) s
    FROM f FULL JOIN t ON t.id = f.id FULL JOIN e ON e.id = coalesce(f.id, t.id)
  )
  SELECT v.id, v.source_type, v.source_id, v.memorial_id, v.canonical_memorial_id,
    m.first_name||' '||m.last_name, m.slug, v.title, v.content, fu.s::float8, fu.fr, fu.tr, fu.er
  FROM fused fu JOIN visible v ON v.id = fu.id JOIN memorials m ON m.id = v.memorial_id
  ORDER BY fu.s DESC LIMIT lim;
END $function$;