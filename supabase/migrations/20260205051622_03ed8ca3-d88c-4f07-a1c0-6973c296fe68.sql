-- Add photos array column to memorials table
ALTER TABLE public.memorials 
ADD COLUMN photos text[] DEFAULT '{}'::text[];

-- Add default_photo_index to track which photo is the default
ALTER TABLE public.memorials 
ADD COLUMN default_photo_index integer DEFAULT 0;

-- Migrate existing photo_url to photos array if it exists and is a valid URL (not base64)
UPDATE public.memorials
SET photos = ARRAY[photo_url]
WHERE photo_url IS NOT NULL 
  AND photo_url != '' 
  AND photo_url NOT LIKE 'data:%';