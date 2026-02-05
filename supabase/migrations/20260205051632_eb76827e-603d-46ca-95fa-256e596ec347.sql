-- Create storage bucket for memorial photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('memorial-photos', 'memorial-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to memorial photos
CREATE POLICY "Anyone can view memorial photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'memorial-photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload memorial photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'memorial-photos' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update/delete their own uploaded photos
CREATE POLICY "Users can update their own memorial photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'memorial-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own memorial photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'memorial-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);