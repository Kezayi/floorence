CREATE TABLE public.rag_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('memorial','biography','tribute','event','relation')),
  source_id uuid NOT NULL,
  chunk_index integer NOT NULL DEFAULT 0,
  memorial_id uuid NOT NULL,
  canonical_memorial_id uuid NOT NULL,
  title text,
  content text NOT NULL,
  fts tsvector GENERATED ALWAYS AS (to_tsvector('french', coalesce(title,'') || ' ' || content)) STORED,
  norm text NOT NULL,
  embedding public.vector(384),
  embedding_model text,
  source_updated_at timestamptz,
  indexed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, chunk_index)
);
GRANT ALL ON public.rag_chunks TO service_role;
ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;
CREATE INDEX rag_chunks_fts_idx ON public.rag_chunks USING gin (fts);
CREATE INDEX rag_chunks_trgm_idx ON public.rag_chunks USING gin (norm public.gin_trgm_ops);
CREATE INDEX rag_chunks_mem_idx ON public.rag_chunks (memorial_id);
CREATE INDEX rag_chunks_vec_idx ON public.rag_chunks USING hnsw (embedding public.vector_cosine_ops);

CREATE TABLE public.rag_index_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id uuid,
  action text NOT NULL,
  chunks integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.rag_index_log TO service_role;
GRANT SELECT ON public.rag_index_log TO authenticated;
ALTER TABLE public.rag_index_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read rag index log" ON public.rag_index_log FOR SELECT TO authenticated USING (public.is_admin_or_moderator(auth.uid()));

CREATE OR REPLACE FUNCTION public.rag_norm(t text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(public.unaccent(coalesce(t,'')))
$$;

CREATE OR REPLACE FUNCTION public.rag_reindex_memorial(p_memorial_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m record; canon uuid; n integer := 0; para text; i integer := 0;
BEGIN
  DELETE FROM rag_chunks WHERE memorial_id = p_memorial_id;
  SELECT * INTO m FROM memorials WHERE id = p_memorial_id;
  IF NOT FOUND OR m.deleted_at IS NOT NULL OR NOT m.is_active OR NOT m.is_published THEN
    INSERT INTO rag_index_log(memorial_id, action, chunks) VALUES (p_memorial_id, 'purge', 0);
    RETURN 0;
  END IF;
  canon := coalesce(m.merged_into, m.id);
  INSERT INTO rag_chunks(source_type, source_id, memorial_id, canonical_memorial_id, title, content, norm, source_updated_at)
  VALUES ('memorial', m.id, m.id, canon, m.first_name||' '||m.last_name,
    m.first_name||' '||m.last_name||' — né(e) le '||coalesce(m.birth_date::text,'?')||', décédé(e) le '||coalesce(m.death_date::text,'?'),
    rag_norm(m.first_name||' '||m.last_name), m.updated_at);
  n := 1;
  IF coalesce(m.biography,'') <> '' THEN
    FOR para IN SELECT trim(p) FROM regexp_split_to_table(m.biography, E'\\n\\s*\\n') p WHERE length(trim(p)) > 0 LOOP
      INSERT INTO rag_chunks(source_type, source_id, chunk_index, memorial_id, canonical_memorial_id, title, content, norm, source_updated_at)
      VALUES ('biography', m.id, i, m.id, canon, 'Biographie de '||m.first_name||' '||m.last_name, left(para, 2000), rag_norm(left(para,2000)), m.updated_at);
      i := i + 1; n := n + 1;
    END LOOP;
  END IF;
  INSERT INTO rag_chunks(source_type, source_id, memorial_id, canonical_memorial_id, title, content, norm, source_updated_at)
  SELECT 'tribute', g.id, m.id, canon, 'Hommage de '||g.author_name, left(g.content,2000), rag_norm(g.author_name||' '||left(g.content,2000)), g.updated_at
  FROM guestbook_posts g WHERE g.memorial_id = m.id AND NOT g.is_hidden AND g.deleted_at IS NULL;
  GET DIAGNOSTICS i = ROW_COUNT; n := n + i;
  INSERT INTO rag_chunks(source_type, source_id, memorial_id, canonical_memorial_id, title, content, norm, source_updated_at)
  SELECT 'event', e.id, m.id, canon, e.event_type||' du '||to_char(e.event_date,'DD/MM/YYYY'),
    e.event_type||' — '||coalesce(e.location,'lieu non précisé')||'. '||coalesce(e.description,''), rag_norm(coalesce(e.location,'')||' '||coalesce(e.description,'')), e.updated_at
  FROM memorial_events e WHERE e.memorial_id = m.id AND e.is_public;
  GET DIAGNOSTICS i = ROW_COUNT; n := n + i;
  INSERT INTO rag_chunks(source_type, source_id, memorial_id, canonical_memorial_id, title, content, norm)
  SELECT 'relation', r.id, m.id, canon, 'Lien documenté',
    m.first_name||' '||m.last_name||' ↔ '||o.first_name||' '||o.last_name||' ('||r.relation_type||', '||coalesce(r.status,'?')||')',
    rag_norm(o.first_name||' '||o.last_name||' '||r.relation_type)
  FROM memorial_relations r JOIN memorials o ON o.id = r.memorial_id_2
  WHERE r.memorial_id_1 = m.id AND r.status = 'accepted' AND o.deleted_at IS NULL AND o.is_published;
  GET DIAGNOSTICS i = ROW_COUNT; n := n + i;
  INSERT INTO rag_index_log(memorial_id, action, chunks) VALUES (p_memorial_id, 'reindex', n);
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.rag_reindex_memorial(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rag_trg_reindex() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'memorials' THEN mid := OLD.id;
    ELSIF TG_TABLE_NAME = 'memorial_relations' THEN mid := OLD.memorial_id_1;
    ELSE mid := OLD.memorial_id; END IF;
  ELSE
    IF TG_TABLE_NAME = 'memorials' THEN mid := NEW.id;
    ELSIF TG_TABLE_NAME = 'memorial_relations' THEN mid := NEW.memorial_id_1;
    ELSE mid := NEW.memorial_id; END IF;
  END IF;
  IF mid IS NOT NULL THEN PERFORM rag_reindex_memorial(mid); END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER rag_memorials AFTER INSERT OR UPDATE OR DELETE ON public.memorials FOR EACH ROW EXECUTE FUNCTION public.rag_trg_reindex();
CREATE TRIGGER rag_posts AFTER INSERT OR UPDATE OR DELETE ON public.guestbook_posts FOR EACH ROW EXECUTE FUNCTION public.rag_trg_reindex();
CREATE TRIGGER rag_events AFTER INSERT OR UPDATE OR DELETE ON public.memorial_events FOR EACH ROW EXECUTE FUNCTION public.rag_trg_reindex();
CREATE TRIGGER rag_relations AFTER INSERT OR UPDATE OR DELETE ON public.memorial_relations FOR EACH ROW EXECUTE FUNCTION public.rag_trg_reindex();

CREATE OR REPLACE FUNCTION public.rag_hybrid_search(p_query text, p_limit integer DEFAULT 10, p_source_types text[] DEFAULT NULL, p_memorial_id uuid DEFAULT NULL, p_query_embedding public.vector DEFAULT NULL)
RETURNS TABLE(chunk_id uuid, source_type text, source_id uuid, memorial_id uuid, canonical_memorial_id uuid, memorial_name text, memorial_slug text, title text, content text, rrf_score double precision, fts_rank integer, trgm_rank integer, vec_rank integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
        ORDER BY v.embedding <=> p_query_embedding LIMIT 50),
  fused AS (
    SELECT coalesce(f.id, t.id, e.id) id, f.r fr, t.r tr, e.r er,
      coalesce(1.0/(60+f.r),0) + coalesce(1.0/(60+t.r),0) + coalesce(1.0/(60+e.r),0) s
    FROM f FULL JOIN t ON t.id = f.id FULL JOIN e ON e.id = coalesce(f.id, t.id)
  )
  SELECT v.id, v.source_type, v.source_id, v.memorial_id, v.canonical_memorial_id,
    m.first_name||' '||m.last_name, m.slug, v.title, v.content, fu.s::float8, fu.fr, fu.tr, fu.er
  FROM fused fu JOIN visible v ON v.id = fu.id JOIN memorials m ON m.id = v.memorial_id
  ORDER BY fu.s DESC LIMIT lim;
END $$;
REVOKE ALL ON FUNCTION public.rag_hybrid_search(text, integer, text[], uuid, public.vector) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rag_hybrid_search(text, integer, text[], uuid, public.vector) TO authenticated;

CREATE OR REPLACE FUNCTION public.rag_index_stats() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin_or_moderator(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object('chunks', (SELECT count(*) FROM rag_chunks),
    'embedded', (SELECT count(*) FROM rag_chunks WHERE embedding IS NOT NULL),
    'by_type', (SELECT jsonb_object_agg(source_type, n) FROM (SELECT source_type, count(*) n FROM rag_chunks GROUP BY 1) x),
    'last_indexed', (SELECT max(indexed_at) FROM rag_chunks));
END $$;
REVOKE ALL ON FUNCTION public.rag_index_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rag_index_stats() TO authenticated;

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id FROM public.memorials LOOP PERFORM public.rag_reindex_memorial(r.id); END LOOP;
END $$;