
-- Recreate trigger to replace a demo memorial when a real one is created
CREATE TRIGGER trg_replace_demo_on_insert
  AFTER INSERT ON public.memorials
  FOR EACH ROW
  EXECUTE FUNCTION public.replace_demo_memorial();
