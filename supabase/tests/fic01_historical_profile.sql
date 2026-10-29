-- Disposable database ONLY. Synthetic auth rows; transaction is always rolled back.
BEGIN;
CREATE TABLE auth.users(id uuid PRIMARY KEY, created_at timestamptz NOT NULL);
INSERT INTO auth.users VALUES
 ('00000000-0000-4000-8000-000000000011','2026-10-29 09:07:02.351+00'),
 ('00000000-0000-4000-8000-000000000012','2026-10-29 09:07:02.352+00');
CREATE OR REPLACE FUNCTION public.guard_profile_civility() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
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
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
INSERT INTO public.profiles(user_id,profile_completed,civility_required) VALUES('00000000-0000-4000-8000-000000000011',true,true);
SELECT public.fic_assert((SELECT NOT civility_required AND profile_completed AND civility IS NULL FROM public.profiles));
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',true);
INSERT INTO public.profiles(user_id,civility_required) VALUES('00000000-0000-4000-8000-000000000012',false);
SELECT public.fic_assert((SELECT civility_required FROM public.profiles));
DO $$ BEGIN
  BEGIN UPDATE public.profiles SET profile_completed=true,civility_required=false; RAISE EXCEPTION 'new completion bypass'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO public.profiles(user_id,profile_completed) VALUES('00000000-0000-4000-8000-000000000011',true); RAISE EXCEPTION 'foreign account bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
UPDATE public.profiles SET civility='M.',profile_completed=true;
SELECT public.fic_assert((SELECT civility_required AND profile_completed AND civility='M.' FROM public.profiles));
RESET ROLE;
INSERT INTO public.profiles(user_id) VALUES('00000000-0000-4000-8000-000000000013');
SELECT public.fic_assert((SELECT civility_required FROM public.profiles WHERE user_id='00000000-0000-4000-8000-000000000013'));
SELECT public.fic_assert((SELECT NOT civility_required AND profile_completed AND civility IS NULL FROM public.profiles WHERE user_id='00000000-0000-4000-8000-000000000001'));
ROLLBACK;