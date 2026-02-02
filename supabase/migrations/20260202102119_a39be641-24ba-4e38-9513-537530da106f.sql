-- Create table for guestbook posts
CREATE TABLE public.guestbook_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memorial_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  author_name TEXT NOT NULL,
  relation_category TEXT NOT NULL,
  content TEXT NOT NULL,
  photos TEXT[] DEFAULT '{}',
  candle_count INTEGER NOT NULL DEFAULT 0,
  flower_count INTEGER NOT NULL DEFAULT 0,
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.guestbook_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can view guestbook posts (public memorial)
CREATE POLICY "Anyone can view guestbook posts"
ON public.guestbook_posts
FOR SELECT
USING (true);

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
ON public.guestbook_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
ON public.guestbook_posts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
ON public.guestbook_posts
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_guestbook_posts_updated_at
BEFORE UPDATE ON public.guestbook_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_guestbook_posts_memorial_id ON public.guestbook_posts(memorial_id);
CREATE INDEX idx_guestbook_posts_user_id ON public.guestbook_posts(user_id);
CREATE INDEX idx_guestbook_posts_payment_ref ON public.guestbook_posts(payment_reference);