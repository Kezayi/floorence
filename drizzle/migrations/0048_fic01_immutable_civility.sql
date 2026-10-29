CREATE OR REPLACE FUNCTION public.guard_profile_civility_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.civility IS NOT NULL AND NEW.civility IS DISTINCT FROM OLD.civility THEN
    RAISE EXCEPTION 'La civilité enregistrée ne peut plus être modifiée' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_profile_civility_immutable BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_civility_immutable();
ALTER TABLE public.profiles ENABLE ALWAYS TRIGGER guard_profile_civility_immutable;
COMMENT ON FUNCTION public.guard_profile_civility_immutable() IS 'FIC-01: first non-null civility is immutable for all roles, including service and direct SQL; no row backfill; historical onboarding guard unchanged.';
COMMENT ON COLUMN public.profiles.civility IS 'FIC-01: privately declared civility; never inferred; historical NULL valid; first non-null value immutable.';