-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create function to check if user is admin or moderator
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'moderator')
  )
$$;

-- 5. RLS policies for user_roles (only admins can manage)
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Create system_settings table for prices configuration
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings, only admins can update
CREATE POLICY "Anyone can view settings"
  ON public.system_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update settings"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default price settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('candle_price', '{"amount": 500, "currency": "XOF"}', 'Prix d''un cierge'),
  ('flower_price', '{"amount": 1000, "currency": "XOF"}', 'Prix d''une fleur'),
  ('donation_enabled', '{"enabled": true}', 'Activation de la collecte de dons');

-- 7. Add moderation fields to guestbook_posts
ALTER TABLE public.guestbook_posts 
  ADD COLUMN is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN hidden_at timestamptz,
  ADD COLUMN hidden_by uuid REFERENCES auth.users(id),
  ADD COLUMN hidden_reason text;

-- 8. Create memorials table
CREATE TABLE public.memorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  birth_date date,
  death_date date,
  photo_url text,
  biography text,
  funeral_date timestamptz,
  funeral_location text,
  donation_enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- For duplicate management
  merged_into uuid REFERENCES public.memorials(id),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.memorials ENABLE ROW LEVEL SECURITY;

-- Everyone can view active memorials
CREATE POLICY "Anyone can view active memorials"
  ON public.memorials FOR SELECT
  USING (is_active = true AND merged_into IS NULL);

-- Admins can view all memorials
CREATE POLICY "Admins can view all memorials"
  ON public.memorials FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can create memorials
CREATE POLICY "Authenticated users can create memorials"
  ON public.memorials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Creators can update their own memorials
CREATE POLICY "Creators can update their memorials"
  ON public.memorials FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Admins can update any memorial
CREATE POLICY "Admins can update any memorial"
  ON public.memorials FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add foreign key from guestbook_posts to memorials
ALTER TABLE public.guestbook_posts
  ADD CONSTRAINT guestbook_posts_memorial_fk 
  FOREIGN KEY (memorial_id) REFERENCES public.memorials(id) ON DELETE CASCADE;

-- 9. Update RLS for guestbook moderation (admins/mods can update hidden status)
CREATE POLICY "Admins and mods can moderate posts"
  ON public.guestbook_posts FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_moderator(auth.uid()))
  WITH CHECK (public.is_admin_or_moderator(auth.uid()));

-- 10. Create updated_at trigger for new tables
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memorials_updated_at
  BEFORE UPDATE ON public.memorials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Enable realtime for admin monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.memorials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guestbook_posts;