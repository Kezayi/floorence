-- AAA-CHANTIER-03 RIBENGA: same signature; adds editorial_hidden exclusion, query-time source recheck, bounded multi-word fallback.
CREATE OR REPLACE FUNCTION public.rag_hybrid_search(p_query text, p_limit integer DEFAULT 10, p_source_types text[] DEFAULT NULL::text[], p_memorial_id uuid DEFAULT NULL::uuid, p_query_embedding vector DEFAULT NULL::vector)
 RETURNS TABLE(chunk_id uuid, source_type text, source_id uuid, memorial_id uuid, canonical_memorial_id uuid, memorial_name text, memorial_slug text, title text, content text, rrf_score double precision, fts_rank integer, trgm_rank integer, vec_rank integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lim integer := least(greatest(coalesce(p_limit,10),1),50);
  q text := rag_norm(left(coalesce(p_query,''),200));
  words text[];
  nw integer;
  need integer;
  strict_n integer := 0;
  use_fb boolean := false;
BEGIN
  IF NOT is_admin_or_moderator(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501'; END IF;
  IF length(trim(coalesce(p_query,''))) < 2 THEN RETURN; END IF;

  SELECT coalesce(array_agg(w ORDER BY pos), '{}') INTO words FROM (
    SELECT w, min(pos) pos FROM regexp_split_to_table(q, '[^a-z0-9]+') WITH ORDINALITY AS s(w, pos)
    WHERE length(w) >= 3 AND w NOT IN (
      'les','des','une','est','qui','que','quoi','dans','pour','avec','sur','par','ses','aux','entre','quel','quelle','quels','quelles',
      'ont','sont','etait','etaient','cette','ces','cet','mais','plus','tout','tous','toute','nous','vous','ils','elle','elles','leur','leurs',
      'comme','chez','sans','sous','apres','avant','son','aussi','tres','lui','eux','ete','avoir','etre','fait','donc','car','dont',
      'ceux','celle','celui','votre','notre','nos','vos','mes','tes','mon','ton','lien','liens','parle','parler','dire','sait','connait')
    GROUP BY w ORDER BY min(pos) LIMIT 8) x;
  nw := coalesce(array_length(words,1),0);
  need := greatest(1, ceil(nw / 2.0)::int);

  SELECT count(*) INTO strict_n FROM (
    SELECT 1 FROM rag_chunks c WHERE c.fts @@ websearch_to_tsquery('french', p_query) LIMIT 5) s;
  use_fb := strict_n < 5 AND nw >= 1;

  RETURN QUERY
  WITH visible AS (
    SELECT c.* FROM rag_chunks c JOIN memorials m ON m.id = c.memorial_id
    WHERE m.deleted_at IS NULL AND m.is_active AND m.is_published
      AND (p_source_types IS NULL OR c.source_type = ANY(p_source_types))
      AND (p_memorial_id IS NULL OR c.memorial_id = p_memorial_id OR c.canonical_memorial_id = p_memorial_id)
      AND CASE c.source_type
        WHEN 'tribute' THEN EXISTS (SELECT 1 FROM guestbook_posts g WHERE g.id = c.source_id AND g.memorial_id = c.memorial_id
                                    AND NOT g.is_hidden AND NOT g.editorial_hidden AND g.deleted_at IS NULL)
        WHEN 'event' THEN EXISTS (SELECT 1 FROM memorial_events e WHERE e.id = c.source_id AND e.memorial_id = c.memorial_id AND e.is_public)
        WHEN 'relation' THEN EXISTS (SELECT 1 FROM memorial_relations r JOIN memorials o ON o.id = r.memorial_id_2
                                    WHERE r.id = c.source_id AND r.memorial_id_1 = c.memorial_id AND r.status = 'accepted'
                                      AND o.deleted_at IS NULL AND o.is_published)
        WHEN 'memorial' THEN c.source_id = c.memorial_id
        WHEN 'biography' THEN c.source_id = c.memorial_id
        ELSE false END
  ),
  f AS (SELECT v.id, (row_number() OVER (ORDER BY ts_rank_cd(v.fts, websearch_to_tsquery('french', p_query)) DESC))::int r
        FROM visible v WHERE v.fts @@ websearch_to_tsquery('french', p_query) LIMIT 50),
  t AS (SELECT v.id, (row_number() OVER (ORDER BY word_similarity(q, v.norm) DESC))::int r
        FROM visible v WHERE q <% v.norm LIMIT 50),
  fb AS (
    SELECT x.id, (row_number() OVER (ORDER BY x.hits DESC, x.sim DESC))::int r FROM (
      SELECT v.id,
        (SELECT count(*) FROM unnest(words) w
          WHERE v.fts @@ plainto_tsquery('french', w) OR (length(w) >= 4 AND w <% v.norm))::int hits,
        (SELECT coalesce(max(word_similarity(w, v.norm)),0) FROM unnest(words) w) sim
      FROM visible v WHERE use_fb) x
    WHERE x.hits >= need LIMIT 50),
  e AS (SELECT v.id, (row_number() OVER (ORDER BY v.embedding <=> p_query_embedding))::int r
        FROM visible v WHERE p_query_embedding IS NOT NULL AND v.embedding IS NOT NULL
          AND (v.embedding <=> p_query_embedding) <= 0.185
        ORDER BY v.embedding <=> p_query_embedding LIMIT 20),
  ids AS (SELECT id FROM f UNION SELECT id FROM t UNION SELECT id FROM fb UNION SELECT id FROM e),
  fused AS (
    SELECT i.id, f.r fr, coalesce(t.r, fb.r) tr, e.r er,
      coalesce(1.0/(60+f.r),0) + coalesce(1.0/(60+t.r),0) + coalesce(0.5/(60+fb.r),0) + coalesce(1.0/(60+e.r),0) s
    FROM ids i LEFT JOIN f ON f.id = i.id LEFT JOIN t ON t.id = i.id LEFT JOIN fb ON fb.id = i.id LEFT JOIN e ON e.id = i.id
  )
  SELECT v.id, v.source_type, v.source_id, v.memorial_id, v.canonical_memorial_id,
    m.first_name||' '||m.last_name, m.slug, v.title, v.content, fu.s::float8, fu.fr, fu.tr, fu.er
  FROM fused fu JOIN visible v ON v.id = fu.id JOIN memorials m ON m.id = v.memorial_id
  ORDER BY fu.s DESC LIMIT lim;
END $function$;
REVOKE ALL ON FUNCTION public.rag_hybrid_search(text, integer, text[], uuid, vector) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rag_hybrid_search(text, integer, text[], uuid, vector) TO authenticated, service_role;