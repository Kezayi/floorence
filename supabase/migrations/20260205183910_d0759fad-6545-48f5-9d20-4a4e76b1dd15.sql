-- Enable unaccent extension for removing accents from names
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Recreate the generate_secure_slug function
CREATE OR REPLACE FUNCTION public.generate_secure_slug(first_name text, last_name text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;