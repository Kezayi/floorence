-- Fix search_path for newly created functions
ALTER FUNCTION generate_secure_slug(text, text) SET search_path = public;
ALTER FUNCTION migrate_to_secure_slugs() SET search_path = public;