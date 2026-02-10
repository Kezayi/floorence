-- Performance indexes for foreign key columns used in joins
-- These eliminate sequential scans on high-frequency queries

-- Guestbook posts: frequently queried by memorial_id and user_id
CREATE INDEX IF NOT EXISTS idx_guestbook_posts_memorial_id ON public.guestbook_posts (memorial_id);
CREATE INDEX IF NOT EXISTS idx_guestbook_posts_user_id ON public.guestbook_posts (user_id) WHERE user_id IS NOT NULL;

-- Memorial events: queried by memorial_id with date ordering
CREATE INDEX IF NOT EXISTS idx_memorial_events_memorial_id_date ON public.memorial_events (memorial_id, event_date);

-- Memorial relations: queried in both directions
CREATE INDEX IF NOT EXISTS idx_memorial_relations_memorial_1 ON public.memorial_relations (memorial_id_1) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_memorial_relations_memorial_2 ON public.memorial_relations (memorial_id_2) WHERE status = 'accepted';

-- Profiles: avatar lookup by user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- Suggested links: queried by source and target
CREATE INDEX IF NOT EXISTS idx_suggested_links_source ON public.suggested_links (source_memorial_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_suggested_links_target ON public.suggested_links (target_memorial_id) WHERE status = 'pending';

-- Memorials: optimize the main listing query
CREATE INDEX IF NOT EXISTS idx_memorials_published_active ON public.memorials (is_published, is_active) WHERE merged_into IS NULL;
CREATE INDEX IF NOT EXISTS idx_memorials_share_token ON public.memorials (share_token) WHERE share_token IS NOT NULL;