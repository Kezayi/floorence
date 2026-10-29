-- Disposable database ONLY. Synthetic auth rows; transaction is always rolled back.
BEGIN;
CREATE TABLE auth.users(id uuid PRIMARY KEY, created_at timestamptz NOT NULL);
INSERT INTO auth.users VALUES
 ('00000000-0000-4000-8000-000000000011','2026-10-29 09:07:02.351+00'),
 ('00000000-0000-4000-8000-000000000012','2026-10-29 09:07:02.352+00');
\ir ../../drizzle/migrations/0047_fic01_historical_profile_guard.sql
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
SELECT set_config('request.jwt.claim.sub','',true);
INSERT INTO public.profiles(user_id) VALUES('00000000-0000-4000-8000-000000000013');
SELECT public.fic_assert((SELECT civility_required FROM public.profiles WHERE user_id='00000000-0000-4000-8000-000000000013'));
SELECT public.fic_assert((SELECT NOT civility_required AND profile_completed AND civility IS NULL FROM public.profiles WHERE user_id='00000000-0000-4000-8000-000000000001'));
ROLLBACK;