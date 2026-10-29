-- Local disposable database only. Real migration is applied between setup and this file.
CREATE FUNCTION public.fic_assert(ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FIC-01 assertion failed'; END IF; END; $$;
INSERT INTO public.profiles(user_id) VALUES ('00000000-0000-4000-8000-000000000002');
SELECT public.fic_assert((SELECT civility_required AND NOT profile_completed AND civility IS NULL FROM public.profiles WHERE user_id='00000000-0000-4000-8000-000000000002'));
DO $$ BEGIN
  BEGIN UPDATE public.profiles SET profile_completed=true,civility_required=false WHERE user_id='00000000-0000-4000-8000-000000000002'; RAISE EXCEPTION 'new completion bypass'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.profiles SET civility='fils' WHERE user_id='00000000-0000-4000-8000-000000000002'; RAISE EXCEPTION 'invalid value bypass'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
UPDATE public.profiles SET civility='Mme',profile_completed=true WHERE user_id='00000000-0000-4000-8000-000000000002';
SELECT public.fic_assert((SELECT NOT civility_required AND profile_completed AND civility IS NULL FROM public.profiles WHERE user_id='00000000-0000-4000-8000-000000000001'));
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SELECT public.fic_assert((SELECT count(*)=1 FROM public.profiles));
UPDATE public.profiles SET civility='Mlle';
SELECT public.fic_assert((SELECT civility='Mlle' FROM public.profiles));
RESET ROLE;
SELECT public.fic_assert((SELECT civility IS NULL FROM public.profiles WHERE user_id='00000000-0000-4000-8000-000000000001'));
SET ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM * FROM public.profiles; RAISE EXCEPTION 'anonymous read bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;