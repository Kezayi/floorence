-- Soft-delete (corbeille) : mémoriaux, hommages, modèles
ALTER TABLE public.memorials
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.guestbook_posts
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.guestbook_templates
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS idx_memorials_deleted_at ON public.memorials (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guestbook_posts_deleted_at ON public.guestbook_posts (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guestbook_templates_deleted_at ON public.guestbook_templates (deleted_at) WHERE deleted_at IS NOT NULL;

-- Étanchéité publique : un élément en corbeille n'est plus visible
DROP POLICY IF EXISTS "Anyone can view published memorials" ON public.memorials;
CREATE POLICY "Anyone can view published memorials"
  ON public.memorials FOR SELECT
  USING (is_published = true AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.memorials;
CREATE POLICY "Allow authenticated read access"
  ON public.memorials FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "Public can view visible tributes" ON public.guestbook_posts;
CREATE POLICY "Public can view visible tributes"
  ON public.guestbook_posts FOR SELECT
  USING (is_hidden = false AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Allow authenticated read access" ON public.guestbook_posts;
CREATE POLICY "Allow authenticated read access"
  ON public.guestbook_posts FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Vue publique
CREATE OR REPLACE VIEW public.v_public_memorials AS
SELECT id, slug, first_name, last_name, birth_date, death_date, photo_url, biography,
       photos, default_photo_index, created_by, creator_relation, funeral_date,
       funeral_location, donation_enabled, legacy_slug, is_demo, share_token,
       is_published, is_active, total_flowers, total_candles, total_posts,
       social_density_score, network_size, merged_into, notification_frequency,
       notification_start_day, notification_end_day, created_at, updated_at
FROM public.memorials
WHERE deleted_at IS NULL;

-- RPC publiques : exclusion des éléments en corbeille
CREATE OR REPLACE FUNCTION public.get_paginated_memorials(p_search_query text DEFAULT ''::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 12)
 RETURNS TABLE(id uuid, first_name text, last_name text, birth_date date, death_date date, is_published boolean, slug text, photo_url text, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    WITH filtered_memorials AS (
        SELECT m.*
        FROM public.memorials m
        WHERE (p_search_query = '' OR
               m.first_name ILIKE '%' || p_search_query || '%' OR
               m.last_name ILIKE '%' || p_search_query || '%')
        AND m.is_published = true
        AND m.deleted_at IS NULL
    )
    SELECT
        f.id, f.first_name, f.last_name, f.birth_date, f.death_date,
        f.is_published, f.slug, f.photo_url,
        (SELECT COUNT(*) FROM filtered_memorials)
    FROM filtered_memorials f
    ORDER BY f.created_at DESC
    LIMIT LEAST(p_limit, 200) OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_guestbook_posts(p_memorial_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, memorial_id uuid, author_name text, relation_category text, relation_link text, content text, photos text[], candle_count integer, flower_count integer, created_at timestamp with time zone, updated_at timestamp with time zone, author_photo_url text, user_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT gp.id, gp.memorial_id, gp.author_name, gp.relation_category, gp.relation_link,
         gp.content, gp.photos, gp.candle_count, gp.flower_count, gp.created_at,
         gp.updated_at, gp.author_photo_url, gp.user_id
  FROM public.guestbook_posts gp
  WHERE (p_memorial_id IS NULL OR gp.memorial_id = p_memorial_id)
    AND gp.is_hidden = false
    AND gp.deleted_at IS NULL
  ORDER BY gp.created_at DESC
  LIMIT LEAST(p_limit, 200)
  OFFSET p_offset
$function$;