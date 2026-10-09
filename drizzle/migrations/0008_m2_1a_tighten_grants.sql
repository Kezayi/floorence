REVOKE ALL ON public.memorial_merge_confirmations FROM anon, PUBLIC;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.memorial_merge_confirmations FROM authenticated;