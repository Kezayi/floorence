CREATE OR REPLACE FUNCTION public.rag_set_embeddings(p_items jsonb, p_model text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_model IS NULL OR length(p_model) = 0 THEN
    RAISE EXCEPTION 'model required';
  END IF;
  UPDATE public.rag_chunks c
     SET embedding = (i->>'embedding')::public.vector(384),
         embedding_model = p_model
    FROM jsonb_array_elements(p_items) i
   WHERE c.id = (i->>'id')::uuid
     AND md5(c.content) = i->>'content_md5';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.rag_set_embeddings(jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rag_set_embeddings(jsonb, text) TO authenticated;