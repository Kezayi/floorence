-- Disposable PostgreSQL ONLY: minimal shape reproducing existing owner RLS.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.profiles(id uuid DEFAULT gen_random_uuid(),user_id uuid,display_name text,avatar_url text,profile_completed boolean DEFAULT false);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_read ON public.profiles FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE POLICY own_write ON public.profiles FOR UPDATE TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
CREATE POLICY own_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK(auth.uid()=user_id);
GRANT USAGE ON SCHEMA auth TO authenticated;
INSERT INTO public.profiles(user_id,profile_completed) VALUES('00000000-0000-4000-8000-000000000001',true);