
-- Table to store social search questions and AI responses for analysis
CREATE TABLE public.social_search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  question TEXT NOT NULL,
  answer TEXT,
  model TEXT DEFAULT 'google/gemini-3-flash-preview',
  tokens_context INT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_search_history ENABLE ROW LEVEL SECURITY;

-- Admins/moderators can read all history
CREATE POLICY "Admins can view all search history"
  ON public.social_search_history FOR SELECT
  USING (public.is_admin_or_moderator(auth.uid()));

-- Admins/moderators can insert their own searches
CREATE POLICY "Admins can insert own search history"
  ON public.social_search_history FOR INSERT
  WITH CHECK (public.is_admin_or_moderator(auth.uid()));

-- Service role can insert (from edge function)
CREATE POLICY "Service role can insert search history"
  ON public.social_search_history FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Index for analysis queries
CREATE INDEX idx_social_search_history_created ON public.social_search_history(created_at DESC);
CREATE INDEX idx_social_search_history_user ON public.social_search_history(user_id);
