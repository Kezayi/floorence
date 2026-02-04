-- Ajouter la colonne is_published à la table memorials
ALTER TABLE public.memorials ADD COLUMN is_published BOOLEAN DEFAULT false NOT NULL;

-- Mettre tous les mémoriaux actifs existants comme publiés
UPDATE public.memorials SET is_published = true WHERE is_active = true;

-- Créer un index pour améliorer les performances des requêtes filtrées par publication
CREATE INDEX idx_memorials_is_published ON public.memorials(is_published);

-- Mettre à jour la politique RLS pour que seuls les mémoriaux publiés soient visibles publiquement
DROP POLICY IF EXISTS "Anyone can view active memorials" ON public.memorials;

CREATE POLICY "Anyone can view published memorials" 
ON public.memorials 
FOR SELECT 
USING ((is_active = true) AND (is_published = true) AND (merged_into IS NULL));

-- Politique pour que les créateurs/admins puissent voir leurs propres mémoriaux non publiés
CREATE POLICY "Creators can view their unpublished memorials"
ON public.memorials
FOR SELECT
USING (auth.uid() = created_by);