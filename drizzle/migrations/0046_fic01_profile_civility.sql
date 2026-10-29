ALTER TABLE public.profiles ADD COLUMN civility text NULL, ADD COLUMN civility_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_civility_values CHECK (civility IS NULL OR civility IN ('M.', 'Mme', 'Mlle'));
COMMENT ON COLUMN public.profiles.civility IS 'FIC-01: privately declared civility; never inferred; historical NULL is valid.';
CREATE OR REPLACE FUNCTION public.guard_profile_civility() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.civility_required := true;
  ELSE
    NEW.civility_required := OLD.civility_required;
  END IF;
  IF NEW.civility_required AND NEW.profile_completed AND NEW.civility IS NULL THEN
    RAISE EXCEPTION 'Civilité déclarée requise pour compléter un nouveau profil' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_profile_civility BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_civility();
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;