CREATE OR REPLACE FUNCTION public.guard_profile_civility() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Profil réservé à son titulaire' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.civility_required := NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id = NEW.user_id
      AND u.created_at < timestamptz '2026-10-29 09:07:02.352+00'
    );
  ELSE
    NEW.civility_required := OLD.civility_required;
  END IF;
  IF NEW.civility_required AND NEW.profile_completed AND NEW.civility IS NULL THEN
    RAISE EXCEPTION 'Civilité déclarée requise pour compléter un nouveau profil' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION public.guard_profile_civility() IS 'FIC-01: trusted auth creation time before original migration 0046 exempts late-created historical profiles; fail closed for unknown/new accounts; existing flags immutable; no row backfill.';