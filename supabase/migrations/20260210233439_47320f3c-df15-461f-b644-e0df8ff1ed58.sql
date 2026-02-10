-- Synchroniser relationship_type depuis relation_type pour toutes les lignes existantes
UPDATE public.memorial_relations
SET relationship_type = relation_type
WHERE relationship_type IS NULL AND relation_type IS NOT NULL;

-- Trigger pour garder relationship_type synchronisé automatiquement
CREATE OR REPLACE FUNCTION public.sync_relationship_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.relationship_type IS NULL AND NEW.relation_type IS NOT NULL THEN
    NEW.relationship_type := NEW.relation_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sync_relationship_type
BEFORE INSERT OR UPDATE ON public.memorial_relations
FOR EACH ROW
EXECUTE FUNCTION public.sync_relationship_type();

-- Index couvrant sur memorial_id_2 pour compléter idx_relations_sang_final
CREATE INDEX IF NOT EXISTS idx_relations_sang_final_m2
ON public.memorial_relations (memorial_id_2)
INCLUDE (relationship_type, person_a_id, person_b_id);