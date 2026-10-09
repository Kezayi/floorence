-- M2.2B : RPC de lecture consolidée — famille d'un Memorial Master (profondeur 1)
CREATE OR REPLACE FUNCTION public.get_memorial_family_ids(p_master_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH master AS (
    SELECT id
    FROM public.memorials
    WHERE id = p_master_id
      AND is_active
      AND is_published
      AND merged_into IS NULL
      AND deleted_at IS NULL
  )
  SELECT id FROM master
  UNION ALL
  SELECT m.id
  FROM public.memorials m
  WHERE m.merged_into = p_master_id
    AND m.deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM master);
$$;

-- Droits d'exécution minimaux : retrait du grant PUBLIC implicite, grants ciblés
REVOKE EXECUTE ON FUNCTION public.get_memorial_family_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_memorial_family_ids(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_memorial_family_ids(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_memorial_family_ids(uuid) IS
  'M2.2B : retourne le Master et ses avis sources directs (profondeur 1). SECURITY INVOKER : la RLS de memorials filtre les avis privés selon l''appelant. Master inexistant/privé/fusionné/supprimé => ensemble vide.';