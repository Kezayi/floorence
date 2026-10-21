ALTER TABLE public.memorials
  ADD COLUMN IF NOT EXISTS origin_country text,
  ADD COLUMN IF NOT EXISTS origin_locality text,
  ADD COLUMN IF NOT EXISTS residence_country text,
  ADD COLUMN IF NOT EXISTS residence_locality text,
  ADD COLUMN IF NOT EXISTS burial_country text,
  ADD COLUMN IF NOT EXISTS burial_locality text,
  ADD COLUMN IF NOT EXISTS burial_status text;

ALTER TABLE public.memorials
  ADD CONSTRAINT memorials_geo_country_iso CHECK (
    (origin_country IS NULL OR origin_country ~ '^[A-Z]{2}$') AND
    (residence_country IS NULL OR residence_country ~ '^[A-Z]{2}$') AND
    (burial_country IS NULL OR burial_country ~ '^[A-Z]{2}$')),
  ADD CONSTRAINT memorials_geo_locality_len CHECK (
    coalesce(char_length(origin_locality),0) <= 120 AND
    coalesce(char_length(residence_locality),0) <= 120 AND
    coalesce(char_length(burial_locality),0) <= 120),
  ADD CONSTRAINT memorials_burial_status_chk CHECK (burial_status IS NULL OR burial_status IN ('planned','done','unknown'));

COMMENT ON COLUMN public.memorials.origin_country IS 'GEO-01 Terre originelle: ISO 3166-1 alpha-2 declared, never inferred';
COMMENT ON COLUMN public.memorials.residence_country IS 'GEO-01 Terre de vie: last habitual residence, ISO alpha-2';
COMMENT ON COLUMN public.memorials.burial_country IS 'GEO-01 Terre finale: burial country, never inferred from funeral location';
COMMENT ON COLUMN public.memorials.burial_status IS 'GEO-01 planned | done | unknown';

CREATE OR REPLACE FUNCTION public.audit_memorial_geo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old jsonb; v_new jsonb;
BEGIN
  v_new := jsonb_build_object('origin_country',NEW.origin_country,'origin_locality',NEW.origin_locality,
    'residence_country',NEW.residence_country,'residence_locality',NEW.residence_locality,
    'burial_country',NEW.burial_country,'burial_locality',NEW.burial_locality,'burial_status',NEW.burial_status);
  IF TG_OP = 'UPDATE' THEN
    v_old := jsonb_build_object('origin_country',OLD.origin_country,'origin_locality',OLD.origin_locality,
      'residence_country',OLD.residence_country,'residence_locality',OLD.residence_locality,
      'burial_country',OLD.burial_country,'burial_locality',OLD.burial_locality,'burial_status',OLD.burial_status);
    IF v_old = v_new THEN RETURN NEW; END IF;
  ELSE
    IF jsonb_strip_nulls(v_new) = '{}'::jsonb THEN RETURN NEW; END IF;
  END IF;
  INSERT INTO public.audit_logs(action_type, performed_by, details)
  VALUES ('memorial_geo_' || lower(TG_OP), coalesce(auth.uid(), NEW.created_by),
          jsonb_build_object('memorial_id', NEW.id, 'before', v_old, 'after', v_new));
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.audit_memorial_geo() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_audit_memorial_geo
AFTER INSERT OR UPDATE OF origin_country, origin_locality, residence_country, residence_locality, burial_country, burial_locality, burial_status
ON public.memorials FOR EACH ROW EXECUTE FUNCTION public.audit_memorial_geo();