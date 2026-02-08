-- Enable RLS on suggested_links
ALTER TABLE public.suggested_links ENABLE ROW LEVEL SECURITY;

-- Users can view suggestions targeting their memorials
CREATE POLICY "Users can view suggestions for their memorials"
ON public.suggested_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM memorials m
    WHERE (
      (m.id = suggested_links.source_memorial_id OR m.id = suggested_links.target_memorial_id)
      AND (m.created_by = auth.uid() OR m.heir_user_id = auth.uid())
    )
  )
);

-- Users can update (accept/reject) suggestions targeting their memorials
CREATE POLICY "Users can update suggestions for their memorials"
ON public.suggested_links
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM memorials m
    WHERE (
      (m.id = suggested_links.source_memorial_id OR m.id = suggested_links.target_memorial_id)
      AND (m.created_by = auth.uid() OR m.heir_user_id = auth.uid())
    )
  )
);

-- Admins can manage all suggestions
CREATE POLICY "Admins can manage all suggestions"
ON public.suggested_links
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Block anonymous access
CREATE POLICY "Block anonymous access to suggested_links"
ON public.suggested_links
FOR ALL
TO anon
USING (false)
WITH CHECK (false);