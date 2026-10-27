-- Confirmation communautaire volontaire d'un lien accepté (memorial_relations).
-- Témoignage, jamais preuve. Additif : aucune donnée existante modifiée.
CREATE TABLE public.relation_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relation_id uuid NOT NULL REFERENCES public.memorial_relations(id) ON DELETE CASCADE,
  confirmer_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.relation_confirmations TO authenticated;
GRANT ALL ON public.relation_confirmations TO service_role;

ALTER TABLE public.relation_confirmations ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX relation_confirmations_active_uniq
  ON public.relation_confirmations (relation_id, confirmer_id) WHERE revoked_at IS NULL;
CREATE INDEX relation_confirmations_relation_idx
  ON public.relation_confirmations (relation_id) WHERE revoked_at IS NULL;

CREATE POLICY "Members read own confirmations" ON public.relation_confirmations
  FOR SELECT TO authenticated USING (confirmer_id = auth.uid());
CREATE POLICY "Members confirm in own name" ON public.relation_confirmations
  FOR INSERT TO authenticated WITH CHECK (confirmer_id = auth.uid() AND revoked_at IS NULL);
CREATE POLICY "Members revoke own confirmation" ON public.relation_confirmations
  FOR UPDATE TO authenticated USING (confirmer_id = auth.uid() AND revoked_at IS NULL)
  WITH CHECK (confirmer_id = auth.uid());

-- Garde serveur : lien admissible, membre indépendant, seule révocation autorisée.
CREATE OR REPLACE FUNCTION public.guard_relation_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.memorial_relations%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.relation_id <> OLD.relation_id OR NEW.confirmer_id <> OLD.confirmer_id
       OR NEW.created_at <> OLD.created_at OR OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL THEN
      RAISE EXCEPTION 'Seule la révocation de sa propre confirmation est autorisée';
    END IF;
    NEW.revoked_at := now();
    RETURN NEW;
  END IF;

  IF NEW.confirmer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Confirmation uniquement en son propre nom';
  END IF;
  NEW.created_at := now();
  NEW.revoked_at := NULL;

  SELECT * INTO r FROM public.memorial_relations WHERE id = NEW.relation_id;
  IF NOT FOUND OR r.status IS DISTINCT FROM 'accepted' THEN
    RAISE EXCEPTION 'Lien non admissible';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = r.memorial_id_1
                   AND m.is_published AND m.is_active AND m.deleted_at IS NULL)
     OR NOT EXISTS (SELECT 1 FROM public.memorials m WHERE m.id = r.memorial_id_2
                   AND m.is_published AND m.is_active AND m.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Lien non admissible';
  END IF;
  IF r.requested_by = NEW.confirmer_id OR EXISTS (
       SELECT 1 FROM public.memorials m
       WHERE m.id IN (r.memorial_id_1, r.memorial_id_2)
         AND (m.created_by = NEW.confirmer_id OR m.heir_user_id = NEW.confirmer_id)) THEN
    RAISE EXCEPTION 'Les auteurs et gestionnaires du lien ne peuvent pas le confirmer';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_guard_relation_confirmation
  BEFORE INSERT OR UPDATE ON public.relation_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.guard_relation_confirmation();

-- Compteur public : membres distincts actifs, uniquement pour liens visibles.
CREATE OR REPLACE FUNCTION public.get_relation_confirmation_counts(p_relation_ids uuid[])
RETURNS TABLE(relation_id uuid, confirmations bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, count(DISTINCT c.confirmer_id)
  FROM public.memorial_relations r
  JOIN public.memorials m1 ON m1.id = r.memorial_id_1 AND m1.is_published AND m1.is_active AND m1.deleted_at IS NULL
  JOIN public.memorials m2 ON m2.id = r.memorial_id_2 AND m2.is_published AND m2.is_active AND m2.deleted_at IS NULL
  LEFT JOIN public.relation_confirmations c ON c.relation_id = r.id AND c.revoked_at IS NULL
  WHERE r.id = ANY(p_relation_ids[1:200]) AND r.status = 'accepted'
  GROUP BY r.id
$$;
REVOKE ALL ON FUNCTION public.get_relation_confirmation_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_relation_confirmation_counts(uuid[]) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_relation_confirmation() FROM PUBLIC, anon, authenticated;