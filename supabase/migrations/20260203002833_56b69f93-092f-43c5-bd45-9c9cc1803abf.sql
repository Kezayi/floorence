-- =============================================
-- 1. Ajouter les colonnes manquantes à memorials
-- =============================================

-- Programme obsèques : date et lieu d'inhumation déjà présents (funeral_date, funeral_location)
-- Ajouter : héritier numérique, désactivation auto dons, anniversaire

ALTER TABLE public.memorials
ADD COLUMN IF NOT EXISTS heir_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS heir_email text,
ADD COLUMN IF NOT EXISTS contributions_disabled_at timestamp with time zone;

COMMENT ON COLUMN public.memorials.heir_user_id IS 'ID de l''héritier numérique désigné';
COMMENT ON COLUMN public.memorials.heir_email IS 'Email de l''héritier numérique (avant inscription)';
COMMENT ON COLUMN public.memorials.contributions_disabled_at IS 'Date à laquelle les contributions ont été désactivées automatiquement';

-- =============================================
-- 2. Table des événements obsèques / recueillements
-- =============================================

CREATE TABLE IF NOT EXISTS public.memorial_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('WAKE', 'BURIAL', 'COMMEMORATION', 'ANNIVERSARY', 'GATHERING')),
  event_date timestamp with time zone NOT NULL,
  event_end_time time,
  location text,
  gps_coordinates text,
  description text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index pour la recherche par mémorial et date
CREATE INDEX IF NOT EXISTS idx_memorial_events_memorial_id ON public.memorial_events(memorial_id);
CREATE INDEX IF NOT EXISTS idx_memorial_events_date ON public.memorial_events(event_date);

-- Enable RLS
ALTER TABLE public.memorial_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view public events of active memorials"
ON public.memorial_events
FOR SELECT
USING (
  is_public = true 
  AND EXISTS (
    SELECT 1 FROM public.memorials m 
    WHERE m.id = memorial_id 
    AND m.is_active = true 
    AND m.merged_into IS NULL
  )
);

CREATE POLICY "Memorial creators can manage their events"
ON public.memorial_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.memorials m 
    WHERE m.id = memorial_id 
    AND m.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memorials m 
    WHERE m.id = memorial_id 
    AND m.created_by = auth.uid()
  )
);

CREATE POLICY "Heirs can manage memorial events"
ON public.memorial_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.memorials m 
    WHERE m.id = memorial_id 
    AND m.heir_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.memorials m 
    WHERE m.id = memorial_id 
    AND m.heir_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all events"
ON public.memorial_events
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_memorial_events_updated_at
BEFORE UPDATE ON public.memorial_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 3. Table transactions paiement création mémorial
-- (mise à jour pour distinguer les types)
-- =============================================

-- Ajouter un commentaire pour clarifier payment_type
COMMENT ON COLUMN public.payment_transactions.payment_type IS 'Type: memorial_creation, candle, flower, contribution';

-- =============================================
-- 4. Fonction pour désactiver auto les contributions
-- =============================================

CREATE OR REPLACE FUNCTION public.disable_contributions_after_funeral()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.memorials
  SET 
    donation_enabled = false,
    contributions_disabled_at = now(),
    updated_at = now()
  WHERE 
    funeral_date IS NOT NULL
    AND funeral_date < now()
    AND donation_enabled = true
    AND contributions_disabled_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.disable_contributions_after_funeral IS 'Désactive automatiquement les contributions après la date d''inhumation';

-- =============================================
-- 5. Fonction pour vérifier si création gratuite
-- =============================================

CREATE OR REPLACE FUNCTION public.is_memorial_creation_free(p_funeral_date timestamp with time zone)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(p_funeral_date > now(), false);
$$;

COMMENT ON FUNCTION public.is_memorial_creation_free IS 'Retourne true si la création du mémorial est gratuite (obsèques dans le futur)';