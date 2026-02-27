
-- Rate limiting: max 3 hommages par heure par utilisateur
CREATE OR REPLACE FUNCTION public.check_guestbook_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_count integer;
BEGIN
  -- Compter les insertions de cet utilisateur dans la dernière heure
  SELECT COUNT(*) INTO recent_count
  FROM public.guestbook_posts
  WHERE user_id = NEW.user_id
    AND created_at > (now() - interval '1 hour');

  IF recent_count >= 3 THEN
    RAISE EXCEPTION 'Limite d''hommages atteinte. Veuillez patienter avant votre prochain message.';
  END IF;

  RETURN NEW;
END;
$$;

-- Attacher le trigger BEFORE INSERT
CREATE TRIGGER trg_guestbook_rate_limit
  BEFORE INSERT ON public.guestbook_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_guestbook_rate_limit();
