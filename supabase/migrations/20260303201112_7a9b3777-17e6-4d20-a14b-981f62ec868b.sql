
-- Create ritual_prices table
CREATE TABLE public.ritual_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL UNIQUE,
  unit_price integer NOT NULL DEFAULT 500,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ritual_prices ENABLE ROW LEVEL SECURITY;

-- Anyone can read prices
CREATE POLICY "Anyone can view ritual prices"
  ON public.ritual_prices FOR SELECT
  USING (true);

-- Admins can manage prices
CREATE POLICY "Admins can manage ritual prices"
  ON public.ritual_prices FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed default prices
INSERT INTO public.ritual_prices (item_type, unit_price) VALUES
  ('cierge', 500),
  ('fleur', 500)
ON CONFLICT (item_type) DO NOTHING;

-- Seed is_monetized in global_settings
INSERT INTO public.global_settings (key, value_bool) VALUES
  ('is_monetized', false)
ON CONFLICT (key) DO NOTHING;

-- Validation trigger: enforce min 500 FCFA
CREATE OR REPLACE FUNCTION public.validate_ritual_price()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.unit_price < 500 THEN
    RAISE EXCEPTION 'Le prix minimum est de 500 FCFA';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_ritual_price
  BEFORE INSERT OR UPDATE ON public.ritual_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ritual_price();
