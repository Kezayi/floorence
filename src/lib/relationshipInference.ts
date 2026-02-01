// Relationship inference logic based on shared connection to the deceased

interface RelationshipMap {
  [key: string]: {
    gender: "M" | "F" | "N";
    generation: number; // 0 = same gen as deceased, positive = older, negative = younger
    lineage: "direct" | "in-law" | "extended" | "other";
  };
}

const relationshipData: RelationshipMap = {
  // Famille directe
  "Son Père": { gender: "M", generation: 1, lineage: "direct" },
  "Sa Mère": { gender: "F", generation: 1, lineage: "direct" },
  "Son Fils": { gender: "M", generation: -1, lineage: "direct" },
  "Sa Fille": { gender: "F", generation: -1, lineage: "direct" },
  "Son Frère": { gender: "M", generation: 0, lineage: "direct" },
  "Sa Sœur": { gender: "F", generation: 0, lineage: "direct" },
  "Son Grand-père": { gender: "M", generation: 2, lineage: "direct" },
  "Sa Grand-mère": { gender: "F", generation: 2, lineage: "direct" },
  "Son Petit-fils": { gender: "M", generation: -2, lineage: "direct" },
  "Sa Petite-fille": { gender: "F", generation: -2, lineage: "direct" },
  "Son Oncle": { gender: "M", generation: 1, lineage: "extended" },
  "Sa Tante": { gender: "F", generation: 1, lineage: "extended" },
  "Son Neveu": { gender: "M", generation: -1, lineage: "extended" },
  "Sa Nièce": { gender: "F", generation: -1, lineage: "extended" },
  "Son Cousin": { gender: "M", generation: 0, lineage: "extended" },
  "Sa Cousine": { gender: "F", generation: 0, lineage: "extended" },
  // Alliés
  "Son Époux": { gender: "M", generation: 0, lineage: "in-law" },
  "Son Épouse": { gender: "F", generation: 0, lineage: "in-law" },
  "Son Beau-père": { gender: "M", generation: 1, lineage: "in-law" },
  "Sa Belle-mère": { gender: "F", generation: 1, lineage: "in-law" },
  "Son Beau-frère": { gender: "M", generation: 0, lineage: "in-law" },
  "Sa Belle-sœur": { gender: "F", generation: 0, lineage: "in-law" },
  "Son Gendre": { gender: "M", generation: -1, lineage: "in-law" },
  "Sa Belle-fille": { gender: "F", generation: -1, lineage: "in-law" },
  // Proches
  "Son Ami(e)": { gender: "N", generation: 0, lineage: "other" },
  "Son Collègue": { gender: "N", generation: 0, lineage: "other" },
  "Son Voisin(e)": { gender: "N", generation: 0, lineage: "other" },
  "Son Professeur": { gender: "N", generation: 0, lineage: "other" },
  "Son Élève": { gender: "N", generation: 0, lineage: "other" },
  "Son Mentor": { gender: "N", generation: 0, lineage: "other" },
  "Son Filleul(e)": { gender: "N", generation: -1, lineage: "other" },
  "Son Parrain/Marraine": { gender: "N", generation: 1, lineage: "other" },
  // Autres
  "Une connaissance": { gender: "N", generation: 0, lineage: "other" },
  "Un admirateur": { gender: "N", generation: 0, lineage: "other" },
  "Un anonyme": { gender: "N", generation: 0, lineage: "other" },
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
  relation2: string
): { link: string; confidence: "high" | "medium" | "low" } | null => {
  const data1 = relationshipData[relation1];
  const data2 = relationshipData[relation2];

  if (!data1 || !data2) return null;

  // Même relation = même statut (frères/sœurs, collègues, etc.)
  if (relation1 === relation2) {
    if (relation1 === "Son Fils" || relation1 === "Sa Fille") {
      return { link: "Frères et sœurs", confidence: "high" };
    }
    if (relation1 === "Son Frère" || relation1 === "Sa Sœur") {
      return { link: "Frères et sœurs du défunt", confidence: "high" };
    }
    if (relation1 === "Son Petit-fils" || relation1 === "Sa Petite-fille") {
      return { link: "Petits-enfants (cousins potentiels)", confidence: "medium" };
    }
    if (data1.lineage === "other") {
      return { link: "Même cercle proche", confidence: "low" };
    }
  }

  // Enfants et époux/épouse = Parent et enfant
  if (
    (relation1 === "Son Fils" || relation1 === "Sa Fille") &&
    (relation2 === "Son Époux" || relation2 === "Son Épouse")
  ) {
    return { link: "Parent et enfant", confidence: "high" };
  }
  if (
    (relation2 === "Son Fils" || relation2 === "Sa Fille") &&
    (relation1 === "Son Époux" || relation1 === "Son Épouse")
  ) {
    return { link: "Parent et enfant", confidence: "high" };
  }

  // Enfants et petits-enfants = Grand-parent et petit-enfant
  if (
    (relation1 === "Son Fils" || relation1 === "Sa Fille") &&
    (relation2 === "Son Petit-fils" || relation2 === "Sa Petite-fille")
  ) {
    return { link: "Parent et enfant (ou oncle/tante et neveu/nièce)", confidence: "medium" };
  }
  if (
    (relation2 === "Son Fils" || relation2 === "Sa Fille") &&
    (relation1 === "Son Petit-fils" || relation1 === "Sa Petite-fille")
  ) {
    return { link: "Parent et enfant (ou oncle/tante et neveu/nièce)", confidence: "medium" };
  }

  // Frère/sœur et enfant = Oncle/tante et neveu/nièce
  if (
    (relation1 === "Son Frère" || relation1 === "Sa Sœur") &&
    (relation2 === "Son Fils" || relation2 === "Sa Fille")
  ) {
    return { link: "Oncle/tante et neveu/nièce", confidence: "high" };
  }
  if (
    (relation2 === "Son Frère" || relation2 === "Sa Sœur") &&
    (relation1 === "Son Fils" || relation1 === "Sa Fille")
  ) {
    return { link: "Oncle/tante et neveu/nièce", confidence: "high" };
  }

  // Parents du défunt et enfants du défunt = Grands-parents et petits-enfants
  if (
    (relation1 === "Son Père" || relation1 === "Sa Mère") &&
    (relation2 === "Son Fils" || relation2 === "Sa Fille")
  ) {
    return { link: "Grands-parents et petits-enfants", confidence: "high" };
  }
  if (
    (relation2 === "Son Père" || relation2 === "Sa Mère") &&
    (relation1 === "Son Fils" || relation1 === "Sa Fille")
  ) {
    return { link: "Grands-parents et petits-enfants", confidence: "high" };
  }

  // Beaux-parents et enfants = Beaux-parents et beaux-enfants
  if (
    (relation1 === "Son Beau-père" || relation1 === "Sa Belle-mère") &&
    (relation2 === "Son Fils" || relation2 === "Sa Fille")
  ) {
    return { link: "Grands-parents par alliance et petits-enfants", confidence: "medium" };
  }
  if (
    (relation2 === "Son Beau-père" || relation2 === "Sa Belle-mère") &&
    (relation1 === "Son Fils" || relation1 === "Sa Fille")
  ) {
    return { link: "Grands-parents par alliance et petits-enfants", confidence: "medium" };
  }

  // Générations différentes dans la famille
  if (data1.lineage === "direct" && data2.lineage === "direct") {
    const genDiff = Math.abs(data1.generation - data2.generation);
    if (genDiff === 1) {
      return { link: "Générations proches (famille)", confidence: "medium" };
    }
    if (genDiff === 2) {
      return { link: "Générations éloignées (famille)", confidence: "low" };
    }
  }

  // Relations par alliance avec famille directe
  if (
    (data1.lineage === "in-law" && data2.lineage === "direct") ||
    (data2.lineage === "in-law" && data1.lineage === "direct")
  ) {
    return { link: "Famille par alliance", confidence: "medium" };
  }

  // Autres combinaisons
  if (data1.lineage === "other" && data2.lineage === "other") {
    return { link: "Cercle proche du défunt", confidence: "low" };
  }

  if (data1.lineage === "other" || data2.lineage === "other") {
    return { link: "Lien indirect via le défunt", confidence: "low" };
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

      const inferred = inferRelationship(msg1.relationCategory, msg2.relationCategory);
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
