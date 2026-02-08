-- Enable realtime for memorial_relations table (for community graph auto-sync)
ALTER PUBLICATION supabase_realtime ADD TABLE public.memorial_relations;