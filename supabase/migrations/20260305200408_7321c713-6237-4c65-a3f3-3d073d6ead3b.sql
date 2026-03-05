
-- Table: memorial_follows (tracks who follows which memorial)
CREATE TABLE public.memorial_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, memorial_id)
);

ALTER TABLE public.memorial_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follows"
  ON public.memorial_follows FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can follow memorials"
  ON public.memorial_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow memorials"
  ON public.memorial_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Table: user_notifications (persisted notifications)
CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  memorial_id uuid REFERENCES public.memorials(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.user_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.user_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.user_notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.user_notifications FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Service role insert bypass"
  ON public.user_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;

-- Index for fast notification queries
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_memorial_follows_memorial_id ON public.memorial_follows(memorial_id);
