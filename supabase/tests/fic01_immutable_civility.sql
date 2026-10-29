-- Disposable database ONLY. Every fixture and migration below is rolled back.
BEGIN;
SELECT set_config('request.jwt.claim.sub','',true);
CREATE TABLE auth.users(id uuid PRIMARY KEY, created_at timestamptz NOT NULL);
INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000021','2020-01-01'), ('00000000-0000-4000-8000-000000000022','2026-10-30');
\ir ../../drizzle/migrations/0047_fic01_historical_profile_guard.sql
\ir ../../drizzle/migrations/0048_fic01_immutable_civility.sql
INSERT INTO public.profiles(user_id,profile_completed) VALUES ('00000000-0000-4000-8000-000000000021',true);
SELECT public.fic_assert((SELECT civility IS NULL AND NOT civility_required AND profile_completed FROM public.profiles WHERE user_id='00000000-0000-4000-8000-000000000021'));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000021',true);
UPDATE public.profiles SET civility='M.';
SELECT public.fic_assert((SELECT civility='M.' FROM public.profiles));
DO $$ BEGIN
  BEGIN UPDATE public.profiles SET civility='Mme'; RAISE EXCEPTION 'M. to Mme bypass'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.profiles SET civility=NULL; RAISE EXCEPTION 'M. to NULL bypass'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
UPDATE public.profiles SET civility='M.',display_name='Updated';
SELECT public.fic_assert((SELECT civility='M.' AND display_name='Updated' FROM public.profiles));
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
ALTER ROLE service_role BYPASSRLS;
GRANT USAGE ON SCHEMA auth TO service_role;
SET LOCAL ROLE service_role;
DO $$ BEGIN
  BEGIN UPDATE public.profiles SET civility='Mme' WHERE user_id='00000000-0000-4000-8000-000000000021'; RAISE EXCEPTION 'service change bypass'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN UPDATE public.profiles SET civility=NULL WHERE user_id='00000000-0000-4000-8000-000000000021'; RAISE EXCEPTION 'service null bypass'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL session_replication_role = replica;
DO $$ BEGIN
  BEGIN UPDATE public.profiles SET civility='Mme' WHERE user_id='00000000-0000-4000-8000-000000000021'; RAISE EXCEPTION 'direct SQL replica bypass'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
SET LOCAL session_replication_role = origin;
CREATE UNIQUE INDEX fic_fixture_user_unique ON public.profiles(user_id);
DO $$ BEGIN
  BEGIN INSERT INTO public.profiles(user_id,civility) VALUES ('00000000-0000-4000-8000-000000000021','Mme') ON CONFLICT(user_id) DO UPDATE SET civility=excluded.civility; RAISE EXCEPTION 'upsert bypass'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO public.profiles(user_id,profile_completed) VALUES ('00000000-0000-4000-8000-000000000022',true); RAISE EXCEPTION 'new completion bypass'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
INSERT INTO public.profiles(user_id,civility,profile_completed) VALUES ('00000000-0000-4000-8000-000000000022','Mlle',true);
SELECT public.fic_assert((SELECT civility_required AND civility='Mlle' AND profile_completed FROM public.profiles WHERE user_id='00000000-0000-4000-8000-000000000022'));
ROLLBACK;