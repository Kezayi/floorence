DROP TRIGGER IF EXISTS trigger_check_relationship ON public.memorial_relations;
DROP TRIGGER IF EXISTS tr_on_new_relation ON public.memorial_relations;
DROP TRIGGER IF EXISTS trg_suggest_links_on_insert ON public.memorial_relations;
DROP TRIGGER IF EXISTS trg_suggest_links_on_update ON public.memorial_relations;
DROP TRIGGER IF EXISTS tr_after_update_relations ON public.memorial_relations;
CREATE TRIGGER tr_after_update_relations AFTER INSERT OR UPDATE ON public.memorial_relations FOR EACH ROW EXECUTE FUNCTION public.trigger_generate_suggestions();