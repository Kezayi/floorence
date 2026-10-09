CREATE OR REPLACE FUNCTION public.get_public_memorial_events_consolidated(p_master_id uuid)
RETURNS TABLE(id uuid, memorial_id uuid, event_type text, event_date timestamp with time zone, event_end_time time without time zone, location text, gps_coordinates text, description text, is_public boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  -- SECURITY DEFINER required: the public events policy hides events of merged sources.
  -- Public visibility is re-applied explicitly: Master and each source must be active,
  -- published and not deleted; only is_public events are returned.
  SELECT e.id, e.memorial_id, e.event_type, e.event_date, e.event_end_time, e.location,
         e.gps_coordinates, e.description, e.is_public, e.created_at, e.updated_at
  FROM public.memorial_events e
  JOIN public.memorials m ON m.id = e.memorial_id
  WHERE e.memorial_id IN (SELECT f FROM public.get_memorial_family_ids(p_master_id) f)
    AND e.is_public = true
    AND m.is_active = true
    AND m.is_published = true
    AND m.deleted_at IS NULL
    AND (m.id = p_master_id OR m.merged_into = p_master_id)
  ORDER BY e.event_date ASC, e.id ASC
$$;
REVOKE ALL ON FUNCTION public.get_public_memorial_events_consolidated(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_memorial_events_consolidated(uuid) TO anon, authenticated;