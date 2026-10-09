CREATE OR REPLACE FUNCTION public.is_master_representative(_master_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.memorials m
    WHERE m.id = _master_id AND m.deleted_at IS NULL AND m.merged_into IS NULL
      AND COALESCE(m.heir_user_id, m.created_by) = _user_id)
$$;
REVOKE ALL ON FUNCTION public.is_master_representative(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_master_representative(uuid, uuid) TO authenticated, service_role;

CREATE TABLE public.memorial_merge_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE RESTRICT,
  master_memorial_id uuid NOT NULL REFERENCES public.memorials(id) ON DELETE RESTRICT,
  confirmed_by uuid NOT NULL,
  confirmer_capacity text NOT NULL CHECK (confirmer_capacity IN ('heir','creator')),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','revoked')),
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_mmc_not_self CHECK (source_memorial_id <> master_memorial_id),
  CONSTRAINT chk_mmc_revocation CHECK (
    (status = 'confirmed' AND revoked_at IS NULL AND revoked_by IS NULL)
    OR (status = 'revoked' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL))
);
CREATE UNIQUE INDEX uq_mmc_active_source ON public.memorial_merge_confirmations (source_memorial_id) WHERE status = 'confirmed';
CREATE INDEX idx_mmc_master ON public.memorial_merge_confirmations (master_memorial_id);

GRANT SELECT, INSERT, UPDATE ON public.memorial_merge_confirmations TO authenticated;
GRANT ALL ON public.memorial_merge_confirmations TO service_role;
ALTER TABLE public.memorial_merge_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read merge confirmations" ON public.memorial_merge_confirmations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Representative reads own confirmations" ON public.memorial_merge_confirmations
  FOR SELECT TO authenticated USING (confirmed_by = auth.uid());
CREATE POLICY "Master representative confirms" ON public.memorial_merge_confirmations
  FOR INSERT TO authenticated WITH CHECK (
    confirmed_by = auth.uid() AND status = 'confirmed'
    AND revoked_at IS NULL AND revoked_by IS NULL
    AND public.is_master_representative(master_memorial_id, auth.uid()));
CREATE POLICY "Master representative revokes" ON public.memorial_merge_confirmations
  FOR UPDATE TO authenticated
  USING (status = 'confirmed' AND confirmed_by = auth.uid()
         AND public.is_master_representative(master_memorial_id, auth.uid()))
  WITH CHECK (status = 'revoked' AND revoked_by = auth.uid());

CREATE OR REPLACE FUNCTION public.mmc_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_src record; v_master record;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT id, deleted_at, merged_into INTO v_src FROM memorials WHERE id = NEW.source_memorial_id;
    SELECT id, created_by, heir_user_id INTO v_master FROM memorials WHERE id = NEW.master_memorial_id;
    IF v_src.deleted_at IS NOT NULL OR v_src.merged_into IS NOT NULL THEN
      RAISE EXCEPTION 'Avis source inéligible (supprimé ou déjà associé)';
    END IF;
    IF EXISTS (SELECT 1 FROM memorials WHERE merged_into = NEW.source_memorial_id) THEN
      RAISE EXCEPTION 'Avis source déjà Master d''autres avis (chaîne interdite)';
    END IF;
    IF EXISTS (SELECT 1 FROM memorial_merge_confirmations
               WHERE status = 'confirmed' AND source_memorial_id = NEW.master_memorial_id) THEN
      RAISE EXCEPTION 'Master lui-même confirmé comme source (cycle/chaîne interdit)';
    END IF;
    NEW.confirmer_capacity := CASE WHEN v_master.heir_user_id IS NOT NULL THEN 'heir' ELSE 'creator' END;
    NEW.confirmed_at := now(); NEW.created_at := now(); NEW.updated_at := now();
    RETURN NEW;
  END IF;
  IF NEW.source_memorial_id <> OLD.source_memorial_id OR NEW.master_memorial_id <> OLD.master_memorial_id
     OR NEW.confirmed_by <> OLD.confirmed_by OR NEW.confirmer_capacity <> OLD.confirmer_capacity
     OR NEW.confirmed_at <> OLD.confirmed_at OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Champs de confirmation immuables';
  END IF;
  IF OLD.status <> 'confirmed' OR NEW.status <> 'revoked' THEN
    RAISE EXCEPTION 'Seule la transition confirmed -> revoked est autorisée';
  END IF;
  NEW.revoked_at := now(); NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_mmc_guard BEFORE INSERT OR UPDATE ON public.memorial_merge_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.mmc_guard();