
-- Add notification configuration columns to memorials table
ALTER TABLE public.memorials
  ADD COLUMN IF NOT EXISTS notification_frequency text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notification_start_day integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notification_end_day integer DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.memorials.notification_frequency IS 'Creator override: immediate, weekly_saturday, monthly_window, none. NULL = use admin default.';
COMMENT ON COLUMN public.memorials.notification_start_day IS 'Start day of monthly window (e.g. 25). NULL = use admin default.';
COMMENT ON COLUMN public.memorials.notification_end_day IS 'End day of monthly window (e.g. 5). NULL = use admin default.';

-- Insert default notification settings into system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('notification_frequency', '{"frequency": "weekly_saturday"}'::jsonb, 'Fréquence par défaut des notifications (immediate, weekly_saturday, monthly_window, none)'),
  ('notification_window', '{"start_day": 25, "end_day": 5}'::jsonb, 'Fenêtre mensuelle par défaut pour les notifications (jour de début et fin)')
ON CONFLICT (key) DO NOTHING;
