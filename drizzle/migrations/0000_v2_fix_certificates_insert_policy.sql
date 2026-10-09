BEGIN;
DROP POLICY IF EXISTS "Service role can insert certificates" ON storage.objects;
COMMIT;