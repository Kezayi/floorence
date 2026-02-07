// Utility to map relation strings to their category and provide sorting priority

const familleDirecte = new Set([
  "Son Père", "Sa Mère", "Son Fils", "Sa Fille", "Son Frère", "Sa Sœur",
  "Son Grand-père", "Sa Grand-mère", "Son Petit-fils", "Sa Petite-fille",
  "Son Arrière-grand-père", "Sa Arrière-grand-mère", "Son Arrière-petit-fils", "Sa Arrière-petite-fille",
]);

const familleElargie = new Set([
  "Son Oncle", "Sa Tante", "Son Neveu", "Sa Nièce", "Son Cousin", "Sa Cousine",
  "Son Grand-oncle", "Sa Grand-tante", "Son Petit-neveu", "Sa Petite-nièce",
  "Son Petit-cousin", "Sa Petite-cousine",
]);

const allies = new Set([
  "Son Époux", "Son Épouse", "Son Beau-père", "Sa Belle-mère",
  "Son Beau-frère", "Sa Belle-sœur", "Son Gendre", "Sa Belle-fille",
  "Son Bel-oncle", "Sa Belle-tante",
]);

const socioCoeur = new Set([
  "Son Frère de cœur", "Sa Sœur de cœur", "Son Ami(e)",
  "Son Collègue", "Son Parrain/Marraine", "Son Filleul(e)",
]);

export type RelationCategoryName = "Famille directe" | "Famille élargie" | "Alliés" | "Socio cœur (Amis)" | "Autres";

/** Get the category name from a relation string */
export const getRelationCategory = (relation: string): RelationCategoryName => {
  if (familleDirecte.has(relation)) return "Famille directe";
  if (familleElargie.has(relation)) return "Famille élargie";
  if (allies.has(relation)) return "Alliés";
  if (socioCoeur.has(relation)) return "Socio cœur (Amis)";
  return "Autres";
};

/** Get sort priority (lower = higher priority) */
export const getRelationSortPriority = (relation: string): number => {
  if (familleDirecte.has(relation)) return 1;
  if (familleElargie.has(relation)) return 2;
  if (allies.has(relation)) return 3;
  if (socioCoeur.has(relation)) return 4;
  return 5;
};

/** Category color class for labels */
export const getCategoryColorClass = (relation: string): string => {
  const cat = getRelationCategory(relation);
  switch (cat) {
    case "Famille directe": return "text-foreground";
    case "Famille élargie": return "text-foreground";
    case "Alliés": return "text-[hsl(var(--gesture-candle))]";
    case "Socio cœur (Amis)": return "text-[hsl(var(--gesture-flower))]";
    case "Autres": return "text-muted-foreground";
  }
};
