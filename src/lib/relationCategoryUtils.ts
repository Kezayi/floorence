// Utility to map relation strings to their category and provide sorting priority

const familleDirecte = new Set([
  "Son Père", "Sa Mère", "Son Fils", "Sa Fille",
  "Son Grand-père", "Sa Grand-mère", "Son Petit-fils", "Sa Petite-fille",
  "Son Arrière-grand-père", "Sa Arrière-grand-mère", "Son Arrière-petit-fils", "Sa Arrière-petite-fille",
  "Son Frère", "Sa Sœur",
  // Legacy
  "Son Demi-frère", "Sa Demi-sœur",
]);

const familleElargie = new Set([
  "Son Oncle", "Sa Tante", "Son Neveu", "Sa Nièce", "Son Cousin", "Sa Cousine",
  "Son Grand-oncle", "Sa Grande-tante", "Son Petit-neveu", "Sa Petite-nièce",
  "Son Petit-cousin", "Sa Petite-cousine",
  // Legacy
  "Sa Grand-tante",
]);

const allies = new Set([
  "Son Époux", "Son Épouse", "Son Beau-père", "Sa Belle-mère",
  "Son Beau-fils", "Sa Belle-fille", "Son Beau-frère", "Sa Belle-sœur",
  "Son Bel-oncle", "Sa Belle-tante",
  // Legacy
  "Son Gendre", "Son Co-époux", "Sa Co-épouse",
]);

const socioCoeur = new Set([
  "Son Frère d'une autre mère", "Sa Sœur d'une autre mère",
  "Son Ami", "Son Collègue",
  "Son Co-équipier", "Sa Co-équipière",
  "Son Parrain", "Sa Marraine", "Son Filleul", "Sa Filleule",
  // Legacy
  "Son Frère de cœur", "Sa Sœur de cœur", "Son Ami(e)", "Son Ami(e) d'enfance",
  "Son Parrain/Marraine", "Son Filleul(e)",
  "Son Camarade de promotion", "Son Compagnon d'armes",
]);

const autres = new Set([
  "Son Client", "Sa Cliente", "Son Fournisseur", "Son Prestataire",
  "Son Associé(e)", "Son Élève", "Son Étudiant(e)", "Son Disciple",
  "Son Camarade de classe", "Son Voisin", "Sa Voisine",
  "Son Copropriétaire", "Son Locataire", "Son Bailleur",
  // Legacy
  "Son Voisin(e)", "Son Professeur", "Son Mentor",
  "Son Employeur", "Son Pasteur/Imam", "Son Chef coutumier",
  "Une connaissance", "Un admirateur", "Un anonyme",
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
    case "Famille directe": return "text-[#FF0000]";
    case "Famille élargie": return "text-[#FFD700]";
    case "Alliés": return "text-[#008000]";
    case "Socio cœur (Amis)": return "text-[#0000FF]";
    case "Autres": return "text-[#000000]";
  }
};

/** Category dot/bg color */
export const getCategoryBgColor = (catName: string): string => {
  switch (catName) {
    case "Famille directe": return "#FF0000";
    case "Famille élargie": return "#FFD700";
    case "Alliés": return "#008000";
    case "Socio cœur (Amis)": return "#0000FF";
    case "Autres": return "#000000";
    default: return "#000000";
  }
};
