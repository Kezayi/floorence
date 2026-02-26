
-- Les 3 triggers updated_at ont été créés dans la migration précédente.
-- Maintenant les triggers sur memorial_relations + profiles (avec DROP IF EXISTS pour idempotence)

DROP TRIGGER IF EXISTS trg_suggest_links_on_insert ON public.memorial_relations;
DROP TRIGGER IF EXISTS trg_suggest_links_on_update ON public.memorial_relations;
DROP TRIGGER IF EXISTS trg_check_relationship_coherence ON public.memorial_relations;
DROP TRIGGER IF EXISTS trg_sync_relationship_type ON public.memorial_relations;
DROP TRIGGER IF EXISTS trg_resolve_heir_on_profile ON public.profiles;

-- 5. trigger_generate_suggestions on memorial_relations
CREATE TRIGGER trg_suggest_links_on_insert
  AFTER INSERT ON public.memorial_relations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_generate_suggestions();

CREATE TRIGGER trg_suggest_links_on_update
  AFTER UPDATE ON public.memorial_relations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_generate_suggestions();

-- 6. check_relationship_coherence on memorial_relations
CREATE TRIGGER trg_check_relationship_coherence
  BEFORE INSERT OR UPDATE ON public.memorial_relations
  FOR EACH ROW
  EXECUTE FUNCTION public.check_relationship_coherence();

-- 7. sync_relationship_type on memorial_relations
CREATE TRIGGER trg_sync_relationship_type
  BEFORE INSERT ON public.memorial_relations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_relationship_type();

-- 8. fn_resolve_memorial_heir_v2 on profiles
CREATE TRIGGER trg_resolve_heir_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_resolve_memorial_heir_v2();
