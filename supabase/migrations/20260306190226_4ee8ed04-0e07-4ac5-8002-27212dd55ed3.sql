
-- 1. Unique constraint partiel sur ebilling_reference (idempotence)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ebilling_reference 
ON public.payment_transactions (ebilling_reference) 
WHERE ebilling_reference IS NOT NULL;

-- 2. Trigger de validation du statut (au lieu d'un CHECK constraint)
CREATE OR REPLACE FUNCTION public.validate_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'success', 'failed', 'timeout') THEN
    RAISE EXCEPTION 'Statut invalide: %. Valeurs autorisées: pending, success, failed, timeout', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_payment_status
BEFORE INSERT OR UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_payment_status();
