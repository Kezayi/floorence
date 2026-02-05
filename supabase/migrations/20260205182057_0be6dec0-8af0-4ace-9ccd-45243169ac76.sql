-- Add legacy_slug column to store old slugs for redirects
ALTER TABLE public.memorials 
ADD COLUMN IF NOT EXISTS legacy_slug text;

-- Create index on legacy_slug for fast redirect lookups
CREATE INDEX IF NOT EXISTS idx_memorials_legacy_slug ON public.memorials(legacy_slug);

-- Function to generate secure slug (initials + random ID)
CREATE OR REPLACE FUNCTION generate_secure_slug(first_name text, last_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  initials text;
  random_id text;
  result_slug text;
  counter int := 0;
BEGIN
  -- Get initials (first letter of each name, normalized)
  initials := lower(
    substring(unaccent(first_name) from 1 for 1) || 
    substring(unaccent(last_name) from 1 for 1)
  );
  
  -- Generate random alphanumeric ID (6 chars for unpredictability)
  LOOP
    -- Use base36 encoding of random bytes for compact representation
    random_id := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    result_slug := initials || '-' || random_id;
    
    -- Check if slug already exists
    IF NOT EXISTS (SELECT 1 FROM public.memorials WHERE slug = result_slug) THEN
      RETURN result_slug;
    END IF;
    
    counter := counter + 1;
    IF counter > 100 THEN
      -- Fallback with timestamp if too many collisions
      RETURN initials || '-' || substr(md5(random()::text || now()::text), 1, 8);
    END IF;
  END LOOP;
END;
$$;

-- Migration function to update existing slugs (run manually if needed)
CREATE OR REPLACE FUNCTION migrate_to_secure_slugs()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  memorial_record RECORD;
  new_slug text;
BEGIN
  FOR memorial_record IN 
    SELECT id, slug, first_name, last_name 
    FROM public.memorials 
    WHERE legacy_slug IS NULL AND slug IS NOT NULL
  LOOP
    -- Generate new secure slug
    new_slug := generate_secure_slug(memorial_record.first_name, memorial_record.last_name);
    
    -- Store old slug for redirects and update to new slug
    UPDATE public.memorials 
    SET legacy_slug = memorial_record.slug,
        slug = new_slug
    WHERE id = memorial_record.id;
    
    RAISE NOTICE 'Migrated % → %', memorial_record.slug, new_slug;
  END LOOP;
END;
$$;