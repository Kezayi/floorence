-- Add notified_at column to track when email was sent for each suggestion
ALTER TABLE public.suggested_links
ADD COLUMN IF NOT EXISTS notified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient lookup of un-notified pending suggestions
CREATE INDEX IF NOT EXISTS idx_suggested_links_pending_unnotified 
ON public.suggested_links (status, notified_at) 
WHERE status = 'pending' AND notified_at IS NULL;