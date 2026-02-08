
-- Accept all existing legacy memorial_relations as 'accepted'
UPDATE public.memorial_relations SET status = 'accepted', is_demo = false WHERE status = 'pending' OR status IS NULL;

-- Enable RLS on memorial_relations
ALTER TABLE public.memorial_relations ENABLE ROW LEVEL SECURITY;

-- Anyone can view accepted relations (needed for community graph)
CREATE POLICY "Anyone can view accepted relations"
ON public.memorial_relations
FOR SELECT
USING (status = 'accepted');

-- Memorial owners can view pending requests targeting their memorials
CREATE POLICY "Memorial owners can view pending requests"
ON public.memorial_relations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM memorials m
    WHERE (m.id = memorial_relations.memorial_id_1 OR m.id = memorial_relations.memorial_id_2)
    AND (m.created_by = auth.uid() OR m.heir_user_id = auth.uid())
  )
);

-- Requesters can view their own requests
CREATE POLICY "Requesters can view their requests"
ON public.memorial_relations
FOR SELECT
USING (auth.uid() = requested_by);

-- Users can create link requests from their own memorials
CREATE POLICY "Users can create link requests for their memorials"
ON public.memorial_relations
FOR INSERT
WITH CHECK (
  auth.uid() = requested_by
  AND EXISTS (
    SELECT 1 FROM memorials m
    WHERE m.id = memorial_relations.memorial_id_1
    AND (m.created_by = auth.uid() OR m.heir_user_id = auth.uid())
  )
);

-- Target memorial owners can update relation status (accept/reject)
CREATE POLICY "Target owners can update relation status"
ON public.memorial_relations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM memorials m
    WHERE m.id = memorial_relations.memorial_id_2
    AND (m.created_by = auth.uid() OR m.heir_user_id = auth.uid())
  )
);

-- Requesters can delete their pending requests
CREATE POLICY "Requesters can delete pending requests"
ON public.memorial_relations
FOR DELETE
USING (auth.uid() = requested_by AND status = 'pending');

-- Admins can manage all relations
CREATE POLICY "Admins can manage all relations"
ON public.memorial_relations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
