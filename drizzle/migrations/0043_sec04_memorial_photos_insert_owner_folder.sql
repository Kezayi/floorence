-- SEC-04: memorial-photos uploads restricted to the caller's own folder (<auth.uid()>/...).
-- All app uploaders (CreateMemorial, PhotoUploader incl. enhanced) write to `${user.id}/...`.
-- Rollback: recreate "memorial-photos: auth upload" FOR INSERT TO authenticated WITH CHECK (bucket_id = 'memorial-photos').
DROP POLICY IF EXISTS "Authenticated users can upload memorial photos" ON storage.objects;
DROP POLICY IF EXISTS "memorial-photos: auth upload" ON storage.objects;
DROP POLICY IF EXISTS "memorial-photos: owner folder upload" ON storage.objects;
CREATE POLICY "memorial-photos: owner folder upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'memorial-photos'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);