-- G1-FIX6: system_settings is the single source of truth for gesture prices.
-- ritual_prices becomes a read-only mirror synchronised in the same transaction.
-- Reversible: DROP TRIGGER trg_sync_ritual_prices ON public.system_settings; DROP FUNCTION public.sync_ritual_prices_from_settings(); and recreate policy "Admins can manage ritual prices".
CREATE OR REPLACE FUNCTION public.sync_ritual_prices_from_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item text;
  v_amount integer;
BEGIN
  IF NEW.key = 'candle_price' THEN v_item := 'cierge';
  ELSIF NEW.key = 'flower_price' THEN v_item := 'fleur';
  ELSE RETURN NEW;
  END IF;

  v_amount := (NEW.value->>'amount')::integer;
  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'Montant invalide pour %', NEW.key;
  END IF;

  UPDATE public.ritual_prices SET unit_price = v_amount WHERE item_type = v_item;
  IF NOT FOUND THEN
    INSERT INTO public.ritual_prices (item_type, unit_price) VALUES (v_item, v_amount);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_ritual_prices_from_settings() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_sync_ritual_prices
AFTER INSERT OR UPDATE OF value ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.sync_ritual_prices_from_settings();

-- Direct admin writes on the mirror are removed: prices change only through system_settings (audited admin function).
DROP POLICY IF EXISTS "Admins can manage ritual prices" ON public.ritual_prices;

COMMENT ON TABLE public.ritual_prices IS 'Read-only mirror of system_settings candle_price/flower_price, kept in sync by trg_sync_ritual_prices.';