
-- Add is_lineage column to memorial_relations
-- true = blood/direct lineage (bordeaux lines), false = alliance/other (gold lines)
ALTER TABLE public.memorial_relations
ADD COLUMN IF NOT EXISTS is_lineage boolean DEFAULT true;

-- Populate based on relation_type classification
-- Alliances and socio-coeur are NOT lineage
UPDATE public.memorial_relations
SET is_lineage = false
WHERE lower(relation_type) IN (
  'époux', 'épouse', 'mari', 'femme', 'conjoint', 'conjointe',
  'beau-père', 'belle-mère', 'beau-frère', 'belle-sœur', 'belle-soeur',
  'gendre', 'belle-fille', 'bel-oncle', 'belle-tante',
  'co-époux', 'co-épouse',
  'son époux', 'son épouse', 'son beau-père', 'sa belle-mère',
  'son beau-frère', 'sa belle-sœur', 'sa belle-soeur',
  'son gendre', 'sa belle-fille', 'son bel-oncle', 'sa belle-tante',
  'son co-époux', 'sa co-épouse'
);

-- Also mark socio-coeur and autres as not lineage
UPDATE public.memorial_relations
SET is_lineage = false
WHERE lower(relation_type) IN (
  'ami', 'amie', 'ami(e)', 'collègue', 'voisin', 'voisine',
  'parrain', 'marraine', 'filleul', 'filleule',
  'frère de cœur', 'sœur de cœur', 'soeur de cœur',
  'camarade de promotion', 'compagnon d''armes',
  'bailleur', 'client', 'disciple', 'maître', 'chef coutumier',
  'son ami(e)', 'son collègue', 'son voisin', 'sa voisine',
  'son parrain/marraine', 'son filleul(e)',
  'son frère de cœur', 'sa sœur de cœur',
  'son camarade de promotion', 'son compagnon d''armes',
  'son bailleur', 'son client', 'son disciple', 'son maître', 'son chef coutumier',
  'son ami(e) d''enfance'
);

-- Ensure blood relations are explicitly true
UPDATE public.memorial_relations
SET is_lineage = true
WHERE is_lineage IS NULL OR (
  lower(relation_type) IN (
    'père', 'mère', 'fils', 'fille', 'frère', 'sœur', 'soeur',
    'grand-père', 'grand-mère', 'petit-fils', 'petite-fille',
    'arrière-grand-père', 'arrière-grand-mère',
    'arrière-petit-fils', 'arrière-petite-fille',
    'oncle', 'tante', 'neveu', 'nièce',
    'cousin', 'cousine', 'demi-frère', 'demi-sœur', 'demi-soeur',
    'grand-oncle', 'grand-tante', 'petit-neveu', 'petite-nièce',
    'petit-cousin', 'petite-cousine',
    'son père', 'sa mère', 'son fils', 'sa fille',
    'son frère', 'sa sœur', 'son grand-père', 'sa grand-mère',
    'son petit-fils', 'sa petite-fille',
    'son oncle', 'sa tante', 'son neveu', 'sa nièce',
    'son cousin', 'sa cousine'
  )
);

-- Create index for lineage filtering
CREATE INDEX IF NOT EXISTS idx_memorial_relations_is_lineage 
ON public.memorial_relations (is_lineage) WHERE is_lineage = true;
