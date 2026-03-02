
ALTER TABLE public.guestbook_templates 
ADD COLUMN IF NOT EXISTS tone text NOT NULL DEFAULT 'sobre',
ADD COLUMN IF NOT EXISTS relation text,
ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0;
