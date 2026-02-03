// Relationship inference logic based on shared connection to the deceased

interface RelationshipMap {
  [key: string]: {
    gender: "M" | "F" | "N";
    generation: number; // 0 = same gen as deceased, positive = older, negative = younger
    lineage: "direct" | "in-law" | "extended" | "other";
    cleanName: string; // Name without possessive pronoun
    withDeceased: string; // Format "X du/de la défunt(e)"
  };
}

const relationshipData: RelationshipMap = {
  // Famille directe
  "Son Père": { gender: "M", generation: 1, lineage: "direct", cleanName: "Père", withDeceased: "Père du défunt" },
  "Sa Mère": { gender: "F", generation: 1, lineage: "direct", cleanName: "Mère", withDeceased: "Mère du défunt" },
  "Son Fils": { gender: "M", generation: -1, lineage: "direct", cleanName: "Fils", withDeceased: "Fils du défunt" },
  "Sa Fille": { gender: "F", generation: -1, lineage: "direct", cleanName: "Fille", withDeceased: "Fille du défunt" },
  "Son Frère": { gender: "M", generation: 0, lineage: "direct", cleanName: "Frère", withDeceased: "Frère du défunt" },
  "Sa Sœur": { gender: "F", generation: 0, lineage: "direct", cleanName: "Sœur", withDeceased: "Sœur du défunt" },
  "Son Grand-père": { gender: "M", generation: 2, lineage: "direct", cleanName: "Grand-père", withDeceased: "Grand-père du défunt" },
  "Sa Grand-mère": { gender: "F", generation: 2, lineage: "direct", cleanName: "Grand-mère", withDeceased: "Grand-mère du défunt" },
  "Son Petit-fils": { gender: "M", generation: -2, lineage: "direct", cleanName: "Petit-fils", withDeceased: "Petit-fils du défunt" },
  "Sa Petite-fille": { gender: "F", generation: -2, lineage: "direct", cleanName: "Petite-fille", withDeceased: "Petite-fille du défunt" },
  "Son Oncle": { gender: "M", generation: 1, lineage: "extended", cleanName: "Oncle", withDeceased: "Oncle du défunt" },
  "Sa Tante": { gender: "F", generation: 1, lineage: "extended", cleanName: "Tante", withDeceased: "Tante du défunt" },
  "Son Neveu": { gender: "M", generation: -1, lineage: "extended", cleanName: "Neveu", withDeceased: "Neveu du défunt" },
  "Sa Nièce": { gender: "F", generation: -1, lineage: "extended", cleanName: "Nièce", withDeceased: "Nièce du défunt" },
  "Son Cousin": { gender: "M", generation: 0, lineage: "extended", cleanName: "Cousin", withDeceased: "Cousin du défunt" },
  "Sa Cousine": { gender: "F", generation: 0, lineage: "extended", cleanName: "Cousine", withDeceased: "Cousine du défunt" },
  // Alliés
  "Son Époux": { gender: "M", generation: 0, lineage: "in-law", cleanName: "Époux", withDeceased: "Époux de la défunte" },
  "Son Épouse": { gender: "F", generation: 0, lineage: "in-law", cleanName: "Épouse", withDeceased: "Épouse du défunt" },
  "Son Beau-père": { gender: "M", generation: 1, lineage: "in-law", cleanName: "Beau-père", withDeceased: "Beau-père du défunt" },
  "Sa Belle-mère": { gender: "F", generation: 1, lineage: "in-law", cleanName: "Belle-mère", withDeceased: "Belle-mère du défunt" },
  "Son Beau-frère": { gender: "M", generation: 0, lineage: "in-law", cleanName: "Beau-frère", withDeceased: "Beau-frère du défunt" },
  "Sa Belle-sœur": { gender: "F", generation: 0, lineage: "in-law", cleanName: "Belle-sœur", withDeceased: "Belle-sœur du défunt" },
  "Son Gendre": { gender: "M", generation: -1, lineage: "in-law", cleanName: "Gendre", withDeceased: "Gendre du défunt" },
  "Sa Belle-fille": { gender: "F", generation: -1, lineage: "in-law", cleanName: "Belle-fille", withDeceased: "Belle-fille du défunt" },
  // Proches
  "Son Ami(e)": { gender: "N", generation: 0, lineage: "other", cleanName: "Ami(e)", withDeceased: "Ami(e) du défunt" },
  "Son Collègue": { gender: "N", generation: 0, lineage: "other", cleanName: "Collègue", withDeceased: "Collègue du défunt" },
  "Son Voisin(e)": { gender: "N", generation: 0, lineage: "other", cleanName: "Voisin(e)", withDeceased: "Voisin(e) du défunt" },
  "Son Professeur": { gender: "N", generation: 0, lineage: "other", cleanName: "Professeur", withDeceased: "Professeur du défunt" },
  "Son Élève": { gender: "N", generation: 0, lineage: "other", cleanName: "Élève", withDeceased: "Élève du défunt" },
  "Son Mentor": { gender: "N", generation: 0, lineage: "other", cleanName: "Mentor", withDeceased: "Mentor du défunt" },
  "Son Filleul(e)": { gender: "N", generation: -1, lineage: "other", cleanName: "Filleul(e)", withDeceased: "Filleul(e) du défunt" },
  "Son Parrain/Marraine": { gender: "N", generation: 1, lineage: "other", cleanName: "Parrain/Marraine", withDeceased: "Parrain/Marraine du défunt" },
  // Autres
  "Une connaissance": { gender: "N", generation: 0, lineage: "other", cleanName: "Connaissance", withDeceased: "Connaissance du défunt" },
  "Un admirateur": { gender: "N", generation: 0, lineage: "other", cleanName: "Admirateur", withDeceased: "Admirateur du défunt" },
  "Un anonyme": { gender: "N", generation: 0, lineage: "other", cleanName: "Anonyme", withDeceased: "Anonyme" },
};

// Helper function to get clean relation name without possessive
export const getCleanRelationName = (relation: string): string => {
  const data = relationshipData[relation];
  if (data) return data.cleanName;
  // Fallback: remove common possessive prefixes
  return relation.replace(/^(Son |Sa |Une |Un )/i, "");
};

// Helper function to format relation with "du défunt"
export const getRelationWithDeceased = (relation: string): string => {
  const data = relationshipData[relation];
  if (data) return data.withDeceased;
  // Fallback
  const clean = getCleanRelationName(relation);
  return `${clean} du défunt`;
};

export interface InferredRelationship {
  fromAuthor: string;
  fromRelation: string;
  toAuthor: string;
  toRelation: string;
  inferredLink: string;
  confidence: "high" | "medium" | "low";
}

export const inferRelationship = (
  relation1: string,
  relation2: string,
  author1Name: string,
  author2Name: string
): { link: string; confidence: "high" | "medium" | "low" } | null => {
  const data1 = relationshipData[relation1];
  const data2 = relationshipData[relation2];

  if (!data1 || !data2) return null;

  // Helper to get first name for cleaner display
  const firstName = (name: string) => name.split(" ")[0];
  const name1 = firstName(author1Name);
  const name2 = firstName(author2Name);

  // ============================================
  // ENFANTS ET ÉPOUX/ÉPOUSE = Parent et enfant
  // ============================================
  
  // Si A est Fils/Fille du défunt ET B est Époux/Épouse du défunt → A est l'enfant de B
  if (
    (relation1 === "Son Fils" || relation1 === "Sa Fille") &&
    (relation2 === "Son Époux" || relation2 === "Son Épouse")
  ) {
    const childType = relation1 === "Son Fils" ? "le fils" : "la fille";
    return { link: `${name1} est ${childType} de ${name2}`, confidence: "high" };
  }
  if (
    (relation2 === "Son Fils" || relation2 === "Sa Fille") &&
    (relation1 === "Son Époux" || relation1 === "Son Épouse")
  ) {
    const childType = relation2 === "Son Fils" ? "le fils" : "la fille";
    return { link: `${name2} est ${childType} de ${name1}`, confidence: "high" };
  }

  // ============================================
  // ENFANTS ENTRE EUX = Frères et sœurs
  // ============================================
  
  if (
    (relation1 === "Son Fils" || relation1 === "Sa Fille") &&
    (relation2 === "Son Fils" || relation2 === "Sa Fille")
  ) {
    if (relation1 === "Son Fils" && relation2 === "Son Fils") {
      return { link: `${name1} et ${name2} sont frères`, confidence: "high" };
    }
    if (relation1 === "Sa Fille" && relation2 === "Sa Fille") {
      return { link: `${name1} et ${name2} sont sœurs`, confidence: "high" };
    }
    return { link: `${name1} et ${name2} sont frère et sœur`, confidence: "high" };
  }

  // ============================================
  // FRÈRES/SŒURS DU DÉFUNT ENTRE EUX
  // ============================================
  
  if (
    (relation1 === "Son Frère" || relation1 === "Sa Sœur") &&
    (relation2 === "Son Frère" || relation2 === "Sa Sœur")
  ) {
    if (relation1 === "Son Frère" && relation2 === "Son Frère") {
      return { link: `${name1} et ${name2} sont frères`, confidence: "high" };
    }
    if (relation1 === "Sa Sœur" && relation2 === "Sa Sœur") {
      return { link: `${name1} et ${name2} sont sœurs`, confidence: "high" };
    }
    return { link: `${name1} et ${name2} sont frère et sœur`, confidence: "high" };
  }

  // ============================================
  // PARENTS DU DÉFUNT ET ENFANTS DU DÉFUNT = Grands-parents et petits-enfants
  // ============================================
  
  if (
    (relation1 === "Son Père" || relation1 === "Sa Mère") &&
    (relation2 === "Son Fils" || relation2 === "Sa Fille")
  ) {
    const grandparentType = relation1 === "Son Père" ? "le grand-père" : "la grand-mère";
    return { link: `${name1} est ${grandparentType} de ${name2}`, confidence: "high" };
  }
  if (
    (relation2 === "Son Père" || relation2 === "Sa Mère") &&
    (relation1 === "Son Fils" || relation1 === "Sa Fille")
  ) {
    const grandparentType = relation2 === "Son Père" ? "le grand-père" : "la grand-mère";
    return { link: `${name2} est ${grandparentType} de ${name1}`, confidence: "high" };
  }

  // ============================================
  // FRÈRE/SŒUR DU DÉFUNT ET ENFANT DU DÉFUNT = Oncle/Tante et Neveu/Nièce
  // ============================================
  
  if (
    (relation1 === "Son Frère" || relation1 === "Sa Sœur") &&
    (relation2 === "Son Fils" || relation2 === "Sa Fille")
  ) {
    const uncleAuntType = relation1 === "Son Frère" ? "l'oncle" : "la tante";
    return { link: `${name1} est ${uncleAuntType} de ${name2}`, confidence: "high" };
  }
  if (
    (relation2 === "Son Frère" || relation2 === "Sa Sœur") &&
    (relation1 === "Son Fils" || relation1 === "Sa Fille")
  ) {
    const uncleAuntType = relation2 === "Son Frère" ? "l'oncle" : "la tante";
    return { link: `${name2} est ${uncleAuntType} de ${name1}`, confidence: "high" };
  }

  // ============================================
  // PETITS-ENFANTS ENTRE EUX = Cousins potentiels
  // ============================================
  
  if (
    (relation1 === "Son Petit-fils" || relation1 === "Sa Petite-fille") &&
    (relation2 === "Son Petit-fils" || relation2 === "Sa Petite-fille")
  ) {
    return { link: `${name1} et ${name2} sont cousins`, confidence: "medium" };
  }

  // ============================================
  // ENFANTS ET PETITS-ENFANTS
  // ============================================
  
  if (
    (relation1 === "Son Fils" || relation1 === "Sa Fille") &&
    (relation2 === "Son Petit-fils" || relation2 === "Sa Petite-fille")
  ) {
    return { link: `${name1} est possiblement le parent de ${name2}`, confidence: "medium" };
  }
  if (
    (relation2 === "Son Fils" || relation2 === "Sa Fille") &&
    (relation1 === "Son Petit-fils" || relation1 === "Sa Petite-fille")
  ) {
    return { link: `${name2} est possiblement le parent de ${name1}`, confidence: "medium" };
  }

  // ============================================
  // BEAUX-PARENTS ET ENFANTS DU DÉFUNT
  // ============================================
  
  if (
    (relation1 === "Son Beau-père" || relation1 === "Sa Belle-mère") &&
    (relation2 === "Son Fils" || relation2 === "Sa Fille")
  ) {
    const grandparentType = relation1 === "Son Beau-père" ? "le grand-père par alliance" : "la grand-mère par alliance";
    return { link: `${name1} est ${grandparentType} de ${name2}`, confidence: "medium" };
  }
  if (
    (relation2 === "Son Beau-père" || relation2 === "Sa Belle-mère") &&
    (relation1 === "Son Fils" || relation1 === "Sa Fille")
  ) {
    const grandparentType = relation2 === "Son Beau-père" ? "le grand-père par alliance" : "la grand-mère par alliance";
    return { link: `${name2} est ${grandparentType} de ${name1}`, confidence: "medium" };
  }

  // ============================================
  // BEAU-FRÈRE/BELLE-SŒUR ET ENFANTS
  // ============================================
  
  if (
    (relation1 === "Son Beau-frère" || relation1 === "Sa Belle-sœur") &&
    (relation2 === "Son Fils" || relation2 === "Sa Fille")
  ) {
    const uncleAuntType = relation1 === "Son Beau-frère" ? "l'oncle par alliance" : "la tante par alliance";
    return { link: `${name1} est ${uncleAuntType} de ${name2}`, confidence: "medium" };
  }
  if (
    (relation2 === "Son Beau-frère" || relation2 === "Sa Belle-sœur") &&
    (relation1 === "Son Fils" || relation1 === "Sa Fille")
  ) {
    const uncleAuntType = relation2 === "Son Beau-frère" ? "l'oncle par alliance" : "la tante par alliance";
    return { link: `${name2} est ${uncleAuntType} de ${name1}`, confidence: "medium" };
  }

  // ============================================
  // GENDRE/BELLE-FILLE ET PARENTS DU DÉFUNT
  // ============================================
  
  if (
    (relation1 === "Son Gendre" || relation1 === "Sa Belle-fille") &&
    (relation2 === "Son Père" || relation2 === "Sa Mère")
  ) {
    return { link: `${name2} est un beau-parent de ${name1}`, confidence: "medium" };
  }
  if (
    (relation2 === "Son Gendre" || relation2 === "Sa Belle-fille") &&
    (relation1 === "Son Père" || relation1 === "Sa Mère")
  ) {
    return { link: `${name1} est un beau-parent de ${name2}`, confidence: "medium" };
  }

  // ============================================
  // PARENTS DU DÉFUNT ENTRE EUX
  // ============================================
  
  if (
    (relation1 === "Son Père" && relation2 === "Sa Mère") ||
    (relation1 === "Sa Mère" && relation2 === "Son Père")
  ) {
    return { link: `${name1} et ${name2} sont les parents du défunt`, confidence: "high" };
  }

  // ============================================
  // GRANDS-PARENTS ENTRE EUX
  // ============================================
  
  if (
    (relation1 === "Son Grand-père" || relation1 === "Sa Grand-mère") &&
    (relation2 === "Son Grand-père" || relation2 === "Sa Grand-mère")
  ) {
    return { link: `${name1} et ${name2} sont les grands-parents du défunt`, confidence: "high" };
  }

  // ============================================
  // COUSINS ENTRE EUX
  // ============================================
  
  if (
    (relation1 === "Son Cousin" || relation1 === "Sa Cousine") &&
    (relation2 === "Son Cousin" || relation2 === "Sa Cousine")
  ) {
    return { link: `${name1} et ${name2} sont cousins`, confidence: "medium" };
  }

  // ============================================
  // ONCLE/TANTE ET COUSIN(E)
  // ============================================
  
  if (
    (relation1 === "Son Oncle" || relation1 === "Sa Tante") &&
    (relation2 === "Son Cousin" || relation2 === "Sa Cousine")
  ) {
    const parentType = relation1 === "Son Oncle" ? "le père" : "la mère";
    return { link: `${name1} est possiblement ${parentType} de ${name2}`, confidence: "medium" };
  }
  if (
    (relation2 === "Son Oncle" || relation2 === "Sa Tante") &&
    (relation1 === "Son Cousin" || relation1 === "Sa Cousine")
  ) {
    const parentType = relation2 === "Son Oncle" ? "le père" : "la mère";
    return { link: `${name2} est possiblement ${parentType} de ${name1}`, confidence: "medium" };
  }

  // ============================================
  // RELATIONS GÉNÉRIQUES PAR LIGNÉE
  // ============================================

  // Générations différentes dans la famille directe
  if (data1.lineage === "direct" && data2.lineage === "direct") {
    const genDiff = Math.abs(data1.generation - data2.generation);
    if (genDiff === 1) {
      return { link: `${name1} et ${name2} sont de la même famille`, confidence: "medium" };
    }
    if (genDiff === 2) {
      return { link: `${name1} et ${name2} sont de la même famille élargie`, confidence: "low" };
    }
  }

  // Relations par alliance avec famille directe
  if (
    (data1.lineage === "in-law" && data2.lineage === "direct") ||
    (data2.lineage === "in-law" && data1.lineage === "direct")
  ) {
    return { link: `${name1} et ${name2} sont liés par alliance`, confidence: "medium" };
  }

  // Mêmes cercles non-familiaux
  if (data1.lineage === "other" && data2.lineage === "other") {
    return { link: `${name1} et ${name2} font partie du cercle proche`, confidence: "low" };
  }

  if (data1.lineage === "other" || data2.lineage === "other") {
    return { link: `${name1} et ${name2} connaissaient le défunt`, confidence: "low" };
  }

  return null;
};

export const inferAllRelationships = (
  messages: Array<{ authorName: string; relationCategory: string }>
): InferredRelationship[] => {
  const relationships: InferredRelationship[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < messages.length; i++) {
    for (let j = i + 1; j < messages.length; j++) {
      const msg1 = messages[i];
      const msg2 = messages[j];

      // Skip if same author
      if (msg1.authorName === msg2.authorName) continue;

      // Create unique key for this pair
      const pairKey = [msg1.authorName, msg2.authorName].sort().join("|");
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const inferred = inferRelationship(
        msg1.relationCategory,
        msg2.relationCategory,
        msg1.authorName,
        msg2.authorName
      );
      if (inferred) {
        relationships.push({
          fromAuthor: msg1.authorName,
          fromRelation: msg1.relationCategory,
          toAuthor: msg2.authorName,
          toRelation: msg2.relationCategory,
          inferredLink: inferred.link,
          confidence: inferred.confidence,
        });
      }
    }
  }

  // Sort by confidence (high first)
  return relationships.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
};
