// ============================================================================
// MOTEUR D'INFÉRENCE UNIFIÉ - Version Finale
// Basé sur la matrice vectorielle (G, L, B, S) du contexte gabonais
// ============================================================================

// Types de lignée
type Lineage = "direct" | "alliance" | "extended" | "coeur" | "other";

// Types de branche
type Branch = "neutral" | "paternal" | "maternal";

// Types de sexe
type Gender = "M" | "F" | "N";

// Interface de la matrice vectorielle
interface RelationVector {
  g: number;       // Génération: positif = plus vieux, négatif = plus jeune
  l: Lineage;      // Lignée
  b: Branch;       // Branche (paternal/maternal)
  s: Gender;       // Sexe
  cleanName: string;
  withDeceased: string;
  category: "FAMILLE" | "ALLIES" | "SOCIO-COEUR" | "AUTRES";
}

// Matrice vectorielle complète des relations
const relationVectors: Record<string, RelationVector> = {
  // ============ FAMILLE DIRECTE ============
  "Son Père": { g: 1, l: "direct", b: "neutral", s: "M", cleanName: "Père", withDeceased: "Père du défunt", category: "FAMILLE" },
  "Sa Mère": { g: 1, l: "direct", b: "neutral", s: "F", cleanName: "Mère", withDeceased: "Mère du défunt", category: "FAMILLE" },
  "Son Fils": { g: -1, l: "direct", b: "neutral", s: "M", cleanName: "Fils", withDeceased: "Fils du défunt", category: "FAMILLE" },
  "Sa Fille": { g: -1, l: "direct", b: "neutral", s: "F", cleanName: "Fille", withDeceased: "Fille du défunt", category: "FAMILLE" },
  "Son Frère": { g: 0, l: "direct", b: "neutral", s: "M", cleanName: "Frère", withDeceased: "Frère du défunt", category: "FAMILLE" },
  "Sa Sœur": { g: 0, l: "direct", b: "neutral", s: "F", cleanName: "Sœur", withDeceased: "Sœur du défunt", category: "FAMILLE" },
  
  // Grands-parents (G+2)
  "Son Grand-père": { g: 2, l: "direct", b: "paternal", s: "M", cleanName: "Grand-père", withDeceased: "Grand-père du défunt", category: "FAMILLE" },
  "Sa Grand-mère": { g: 2, l: "direct", b: "maternal", s: "F", cleanName: "Grand-mère", withDeceased: "Grand-mère du défunt", category: "FAMILLE" },
  
  // Petits-enfants (G-2)
  "Son Petit-fils": { g: -2, l: "direct", b: "neutral", s: "M", cleanName: "Petit-fils", withDeceased: "Petit-fils du défunt", category: "FAMILLE" },
  "Sa Petite-fille": { g: -2, l: "direct", b: "neutral", s: "F", cleanName: "Petite-fille", withDeceased: "Petite-fille du défunt", category: "FAMILLE" },
  
  // Arrière-grands-parents (G+3)
  "Son Arrière-grand-père": { g: 3, l: "direct", b: "neutral", s: "M", cleanName: "Arrière-grand-père", withDeceased: "Arrière-grand-père du défunt", category: "FAMILLE" },
  "Sa Arrière-grand-mère": { g: 3, l: "direct", b: "neutral", s: "F", cleanName: "Arrière-grand-mère", withDeceased: "Arrière-grand-mère du défunt", category: "FAMILLE" },
  
  // Arrière-petits-enfants (G-3)
  "Son Arrière-petit-fils": { g: -3, l: "direct", b: "neutral", s: "M", cleanName: "Arrière-petit-fils", withDeceased: "Arrière-petit-fils du défunt", category: "FAMILLE" },
  "Sa Arrière-petite-fille": { g: -3, l: "direct", b: "neutral", s: "F", cleanName: "Arrière-petite-fille", withDeceased: "Arrière-petite-fille du défunt", category: "FAMILLE" },
  
  // Oncles/Tantes (G+1, extended, branche obligatoire)
  "Son Oncle": { g: 1, l: "extended", b: "paternal", s: "M", cleanName: "Oncle", withDeceased: "Oncle du défunt", category: "FAMILLE" },
  "Sa Tante": { g: 1, l: "extended", b: "maternal", s: "F", cleanName: "Tante", withDeceased: "Tante du défunt", category: "FAMILLE" },
  
  // Neveux/Nièces (G-1, extended)
  "Son Neveu": { g: -1, l: "extended", b: "neutral", s: "M", cleanName: "Neveu", withDeceased: "Neveu du défunt", category: "FAMILLE" },
  "Sa Nièce": { g: -1, l: "extended", b: "neutral", s: "F", cleanName: "Nièce", withDeceased: "Nièce du défunt", category: "FAMILLE" },
  
  // Cousins (G0, extended)
  "Son Cousin": { g: 0, l: "extended", b: "paternal", s: "M", cleanName: "Cousin", withDeceased: "Cousin du défunt", category: "FAMILLE" },
  "Sa Cousine": { g: 0, l: "extended", b: "maternal", s: "F", cleanName: "Cousine", withDeceased: "Cousine du défunt", category: "FAMILLE" },
  
  // Grands-oncles/Grandes-tantes (G+2, extended)
  "Son Grand-oncle": { g: 2, l: "extended", b: "paternal", s: "M", cleanName: "Grand-oncle", withDeceased: "Grand-oncle du défunt", category: "FAMILLE" },
  "Sa Grand-tante": { g: 2, l: "extended", b: "maternal", s: "F", cleanName: "Grand-tante", withDeceased: "Grand-tante du défunt", category: "FAMILLE" },
  
  // Petits-neveux/Petites-nièces (G-2, extended)
  "Son Petit-neveu": { g: -2, l: "extended", b: "neutral", s: "M", cleanName: "Petit-neveu", withDeceased: "Petit-neveu du défunt", category: "FAMILLE" },
  "Sa Petite-nièce": { g: -2, l: "extended", b: "neutral", s: "F", cleanName: "Petite-nièce", withDeceased: "Petite-nièce du défunt", category: "FAMILLE" },
  
  // Petits-cousins (G-1, extended)
  "Son Petit-cousin": { g: -1, l: "extended", b: "neutral", s: "M", cleanName: "Petit-cousin", withDeceased: "Petit-cousin du défunt", category: "FAMILLE" },
  "Sa Petite-cousine": { g: -1, l: "extended", b: "neutral", s: "F", cleanName: "Petite-cousine", withDeceased: "Petite-cousine du défunt", category: "FAMILLE" },
  
  // ============ ALLIÉS (par alliance) ============
  "Son Époux": { g: 0, l: "alliance", b: "neutral", s: "M", cleanName: "Époux", withDeceased: "Époux de la défunte", category: "ALLIES" },
  "Son Épouse": { g: 0, l: "alliance", b: "neutral", s: "F", cleanName: "Épouse", withDeceased: "Épouse du défunt", category: "ALLIES" },
  "Son Beau-père": { g: 1, l: "alliance", b: "neutral", s: "M", cleanName: "Beau-père", withDeceased: "Beau-père du défunt", category: "ALLIES" },
  "Sa Belle-mère": { g: 1, l: "alliance", b: "neutral", s: "F", cleanName: "Belle-mère", withDeceased: "Belle-mère du défunt", category: "ALLIES" },
  "Son Beau-frère": { g: 0, l: "alliance", b: "neutral", s: "M", cleanName: "Beau-frère", withDeceased: "Beau-frère du défunt", category: "ALLIES" },
  "Sa Belle-sœur": { g: 0, l: "alliance", b: "neutral", s: "F", cleanName: "Belle-sœur", withDeceased: "Belle-sœur du défunt", category: "ALLIES" },
  "Son Gendre": { g: -1, l: "alliance", b: "neutral", s: "M", cleanName: "Gendre", withDeceased: "Gendre du défunt", category: "ALLIES" },
  "Sa Belle-fille": { g: -1, l: "alliance", b: "neutral", s: "F", cleanName: "Belle-fille", withDeceased: "Belle-fille du défunt", category: "ALLIES" },
  "Son Bel-oncle": { g: 1, l: "alliance", b: "neutral", s: "M", cleanName: "Bel-oncle", withDeceased: "Bel-oncle du défunt", category: "ALLIES" },
  "Sa Belle-tante": { g: 1, l: "alliance", b: "neutral", s: "F", cleanName: "Belle-tante", withDeceased: "Belle-tante du défunt", category: "ALLIES" },
  
  // ============ SOCIO-CŒUR ============
  "Son Frère de cœur": { g: 0, l: "coeur", b: "neutral", s: "M", cleanName: "Frère de cœur", withDeceased: "Frère de cœur du défunt", category: "SOCIO-COEUR" },
  "Sa Sœur de cœur": { g: 0, l: "coeur", b: "neutral", s: "F", cleanName: "Sœur de cœur", withDeceased: "Sœur de cœur du défunt", category: "SOCIO-COEUR" },
  "Son Ami(e)": { g: 0, l: "coeur", b: "neutral", s: "N", cleanName: "Ami(e)", withDeceased: "Ami(e) du défunt", category: "SOCIO-COEUR" },
  "Son Collègue": { g: 0, l: "coeur", b: "neutral", s: "N", cleanName: "Collègue", withDeceased: "Collègue du défunt", category: "SOCIO-COEUR" },
  "Son Parrain/Marraine": { g: 1, l: "coeur", b: "neutral", s: "N", cleanName: "Parrain/Marraine", withDeceased: "Parrain/Marraine du défunt", category: "SOCIO-COEUR" },
  "Son Filleul(e)": { g: -1, l: "coeur", b: "neutral", s: "N", cleanName: "Filleul(e)", withDeceased: "Filleul(e) du défunt", category: "SOCIO-COEUR" },
  
  // ============ AUTRES ============
  "Son Voisin(e)": { g: 0, l: "other", b: "neutral", s: "N", cleanName: "Voisin(e)", withDeceased: "Voisin(e) du défunt", category: "AUTRES" },
  "Son Professeur": { g: 0, l: "other", b: "neutral", s: "N", cleanName: "Professeur", withDeceased: "Professeur du défunt", category: "AUTRES" },
  "Son Élève": { g: -1, l: "other", b: "neutral", s: "N", cleanName: "Élève", withDeceased: "Élève du défunt", category: "AUTRES" },
  "Son Mentor": { g: 0, l: "other", b: "neutral", s: "N", cleanName: "Mentor", withDeceased: "Mentor du défunt", category: "AUTRES" },
  "Une connaissance": { g: 0, l: "other", b: "neutral", s: "N", cleanName: "Connaissance", withDeceased: "Connaissance du défunt", category: "AUTRES" },
  "Un admirateur": { g: 0, l: "other", b: "neutral", s: "N", cleanName: "Admirateur", withDeceased: "Admirateur du défunt", category: "AUTRES" },
  "Un anonyme": { g: 0, l: "other", b: "neutral", s: "N", cleanName: "Anonyme", withDeceased: "Anonyme", category: "AUTRES" },
};

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

export const getCleanRelationName = (relation: string): string => {
  const data = resolveRelationVector(relation);
  if (data) return data.cleanName;
  return relation.replace(/^(Son |Sa |Une |Un )/i, "");
};

export const getRelationWithDeceased = (relation: string): string => {
  const data = resolveRelationVector(relation);
  if (data) return data.withDeceased;
  const clean = getCleanRelationName(relation);
  return `${clean} du défunt`;
};

export const getRelationVector = (relation: string): RelationVector | null => {
  return resolveRelationVector(relation);
};

/**
 * Resolves a relation string to its vector, handling multiple formats:
 * - Exact match: "Son Père"
 * - Bare name: "Père" → tries "Son Père", "Sa Père"
 * - Reverse lookup by cleanName: "Père" → matches cleanName in vectors
 */
const resolveRelationVector = (relation: string): RelationVector | null => {
  // 1. Direct match
  if (relationVectors[relation]) return relationVectors[relation];

  // 2. Try with "Son " / "Sa " / "Un " / "Une " prefixes
  const prefixes = ["Son ", "Sa ", "Un ", "Une "];
  for (const prefix of prefixes) {
    const key = prefix + relation;
    if (relationVectors[key]) return relationVectors[key];
  }

  // 3. Reverse lookup by cleanName (case-insensitive)
  const lowerRelation = relation.toLowerCase();
  for (const [, vector] of Object.entries(relationVectors)) {
    if (vector.cleanName.toLowerCase() === lowerRelation) return vector;
  }

  return null;
};

// ============================================================================
// INTERFACE D'INFÉRENCE
// ============================================================================

export interface InferredRelationship {
  fromAuthor: string;
  fromRelation: string;
  toAuthor: string;
  toRelation: string;
  inferredLink: string;
  confidence: "high" | "medium" | "low";
}

// Résultat de l'inférence entre un utilisateur et une personne trouvée
export interface UserRelationResult {
  label: string;           // Ex: "Votre Frère", "Votre Oncle"
  confidence: "high" | "medium" | "low";
  colorClass: string;      // Classe CSS pour la couleur
}

// ============================================================================
// ALGORITHME D'INFÉRENCE VECTORIELLE
// ============================================================================

const inferByVectors = (
  vectorA: RelationVector,
  vectorB: RelationVector,
  nameA: string,
  nameB: string
): { link: string; confidence: "high" | "medium" | "low" } | null => {
  const deltaG = vectorB.g - vectorA.g;
  const firstName = (name: string) => name.split(" ")[0];
  const n1 = firstName(nameA);
  const n2 = firstName(nameB);

  // ============================================
  // RÈGLE 1: Fratrie (ΔG = 0, lignée directe)
  // ============================================
  if (deltaG === 0 && vectorA.l === "direct" && vectorB.l === "direct" && vectorA.g === 0 && vectorB.g === 0) {
    if (vectorA.s === "M" && vectorB.s === "M") {
      return { link: `${n1} et ${n2} sont frères`, confidence: "high" };
    }
    if (vectorA.s === "F" && vectorB.s === "F") {
      return { link: `${n1} et ${n2} sont sœurs`, confidence: "high" };
    }
    return { link: `${n1} et ${n2} sont frère et sœur`, confidence: "high" };
  }

  // ============================================
  // RÈGLE 2: Enfants du défunt entre eux (tous G-1 direct)
  // ============================================
  if (vectorA.g === -1 && vectorB.g === -1 && vectorA.l === "direct" && vectorB.l === "direct") {
    if (vectorA.s === "M" && vectorB.s === "M") {
      return { link: `${n1} et ${n2} sont frères`, confidence: "high" };
    }
    if (vectorA.s === "F" && vectorB.s === "F") {
      return { link: `${n1} et ${n2} sont sœurs`, confidence: "high" };
    }
    return { link: `${n1} et ${n2} sont frère et sœur`, confidence: "high" };
  }

  // ============================================
  // RÈGLE 3: Époux/Épouse + Enfant = Parent/Enfant (Priorité Gabonaise)
  // ============================================
  if (vectorA.l === "alliance" && vectorA.g === 0 && vectorB.l === "direct" && vectorB.g === -1) {
    // A est époux/épouse, B est enfant → A est parent de B
    const parentLabel = vectorA.s === "F" ? "la mère" : "le père";
    return { link: `${n1} est ${parentLabel} de ${n2}`, confidence: "high" };
  }
  if (vectorB.l === "alliance" && vectorB.g === 0 && vectorA.l === "direct" && vectorA.g === -1) {
    const parentLabel = vectorB.s === "F" ? "la mère" : "le père";
    return { link: `${n2} est ${parentLabel} de ${n1}`, confidence: "high" };
  }

  // ============================================
  // RÈGLE 4: Frère/Sœur du défunt + Enfant du défunt = Oncle/Tante
  // ============================================
  if (vectorA.g === 0 && vectorA.l === "direct" && vectorB.g === -1 && vectorB.l === "direct") {
    const uncleLabel = vectorA.s === "M" ? "l'oncle" : "la tante";
    return { link: `${n1} est ${uncleLabel} de ${n2}`, confidence: "high" };
  }
  if (vectorB.g === 0 && vectorB.l === "direct" && vectorA.g === -1 && vectorA.l === "direct") {
    const uncleLabel = vectorB.s === "M" ? "l'oncle" : "la tante";
    return { link: `${n2} est ${uncleLabel} de ${n1}`, confidence: "high" };
  }

  // ============================================
  // RÈGLE 5: Parent du défunt + Enfant du défunt = Grand-parent
  // ============================================
  if (vectorA.g === 1 && vectorA.l === "direct" && vectorB.g === -1 && vectorB.l === "direct") {
    const gpLabel = vectorA.s === "M" ? "le grand-père" : "la grand-mère";
    return { link: `${n1} est ${gpLabel} de ${n2}`, confidence: "high" };
  }
  if (vectorB.g === 1 && vectorB.l === "direct" && vectorA.g === -1 && vectorA.l === "direct") {
    const gpLabel = vectorB.s === "M" ? "le grand-père" : "la grand-mère";
    return { link: `${n2} est ${gpLabel} de ${n1}`, confidence: "high" };
  }

  // ============================================
  // RÈGLE 6: Parents du défunt entre eux
  // ============================================
  if (vectorA.g === 1 && vectorB.g === 1 && vectorA.l === "direct" && vectorB.l === "direct") {
    if ((vectorA.s === "M" && vectorB.s === "F") || (vectorA.s === "F" && vectorB.s === "M")) {
      return { link: `${n1} et ${n2} sont les parents du défunt`, confidence: "high" };
    }
  }

  // ============================================
  // RÈGLE 7: Oncle/Tante + Fils/Fille = Oncle/Neveu
  // ============================================
  if (vectorA.l === "extended" && vectorA.g === 1 && vectorB.l === "direct" && vectorB.g === -1) {
    const label = vectorA.s === "M" ? "l'oncle" : "la tante";
    return { link: `${n1} est ${label} de ${n2}`, confidence: "high" };
  }
  if (vectorB.l === "extended" && vectorB.g === 1 && vectorA.l === "direct" && vectorA.g === -1) {
    const label = vectorB.s === "M" ? "l'oncle" : "la tante";
    return { link: `${n2} est ${label} de ${n1}`, confidence: "high" };
  }

  // ============================================
  // RÈGLE 8: Cousins entre eux
  // ============================================
  if (vectorA.l === "extended" && vectorB.l === "extended" && vectorA.g === 0 && vectorB.g === 0) {
    return { link: `${n1} et ${n2} sont cousins`, confidence: "medium" };
  }

  // ============================================
  // RÈGLE 9: Petits-enfants entre eux
  // ============================================
  if (vectorA.g === -2 && vectorB.g === -2 && vectorA.l === "direct" && vectorB.l === "direct") {
    return { link: `${n1} et ${n2} sont cousins`, confidence: "medium" };
  }

  // ============================================
  // RÈGLE 10: Enfant + Petit-enfant = Parent probable
  // ============================================
  if (vectorA.g === -1 && vectorB.g === -2 && vectorA.l === "direct" && vectorB.l === "direct") {
    return { link: `${n1} est possiblement le parent de ${n2}`, confidence: "medium" };
  }
  if (vectorB.g === -1 && vectorA.g === -2 && vectorB.l === "direct" && vectorA.l === "direct") {
    return { link: `${n2} est possiblement le parent de ${n1}`, confidence: "medium" };
  }

  // ============================================
  // RÈGLE 11: Relations par alliance + famille
  // ============================================
  if ((vectorA.l === "alliance" && vectorB.l === "direct") || (vectorB.l === "alliance" && vectorA.l === "direct")) {
    return { link: `${n1} et ${n2} sont liés par alliance`, confidence: "medium" };
  }

  // ============================================
  // RÈGLE 12: Beau-frère/Belle-sœur + Enfant = Oncle/Tante par alliance
  // ============================================
  if (vectorA.l === "alliance" && vectorA.g === 0 && vectorB.l === "direct" && vectorB.g === -1) {
    const label = vectorA.s === "M" ? "l'oncle par alliance" : "la tante par alliance";
    return { link: `${n1} est ${label} de ${n2}`, confidence: "medium" };
  }
  if (vectorB.l === "alliance" && vectorB.g === 0 && vectorA.l === "direct" && vectorA.g === -1) {
    const label = vectorB.s === "M" ? "l'oncle par alliance" : "la tante par alliance";
    return { link: `${n2} est ${label} de ${n1}`, confidence: "medium" };
  }

  // ============================================
  // RÈGLE 13: Relations Socio-Cœur
  // ============================================
  if (vectorA.l === "coeur" && vectorB.l === "coeur") {
    return { link: `${n1} et ${n2} font partie du cercle proche`, confidence: "low" };
  }

  // ============================================
  // RÈGLE 14: Autres relations
  // ============================================
  if (vectorA.l === "other" || vectorB.l === "other") {
    return { link: `${n1} et ${n2} connaissaient le défunt`, confidence: "low" };
  }

  // ============================================
  // RÈGLE GÉNÉRIQUE: Famille élargie
  // ============================================
  if ((vectorA.l === "direct" || vectorA.l === "extended") && (vectorB.l === "direct" || vectorB.l === "extended")) {
    const genDiff = Math.abs(deltaG);
    if (genDiff <= 1) {
      return { link: `${n1} et ${n2} sont de la même famille`, confidence: "medium" };
    }
    return { link: `${n1} et ${n2} sont de la même famille élargie`, confidence: "low" };
  }

  return null;
};

// ============================================================================
// FONCTION PRINCIPALE D'INFÉRENCE
// ============================================================================

export const inferRelationship = (
  relation1: string,
  relation2: string,
  author1Name: string,
  author2Name: string
): { link: string; confidence: "high" | "medium" | "low" } | null => {
  const vectorA = resolveRelationVector(relation1);
  const vectorB = resolveRelationVector(relation2);

  if (!vectorA || !vectorB) return null;

  return inferByVectors(vectorA, vectorB, author1Name, author2Name);
};

// ============================================================================
// INFÉRENCE TOUTES LES RELATIONS
// ============================================================================

export const inferAllRelationships = (
  messages: Array<{ authorName: string; relationCategory: string }>
): InferredRelationship[] => {
  const relationships: InferredRelationship[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < messages.length; i++) {
    for (let j = i + 1; j < messages.length; j++) {
      const msg1 = messages[i];
      const msg2 = messages[j];

      if (msg1.authorName === msg2.authorName) continue;

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

  // Trier par confiance (high d'abord)
  return relationships.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
};

// ============================================================================
// INFÉRENCE CONTEXTUELLE UTILISATEUR ↔ PERSONNE TROUVÉE
// Pour la recherche: affiche "Votre Frère" au lieu de "Fils du défunt"
// ============================================================================

export const inferUserToPersonRelation = (
  userRelation: string,
  personRelation: string
): UserRelationResult | null => {
  const vectorUser = resolveRelationVector(userRelation);
  const vectorPerson = resolveRelationVector(personRelation);

  if (!vectorUser || !vectorPerson) return null;

  const deltaG = vectorPerson.g - vectorUser.g;
  
  // Déterminer la classe de couleur basée sur le type de relation
  const getColorClass = (lineage: Lineage, gender: Gender): string => {
    if (lineage === "alliance") return "text-[hsl(var(--gesture-candle))]"; // Doré
    if (gender === "F") return "text-[hsl(var(--gesture-flower))]"; // Rose
    return "text-foreground"; // Noir
  };

  // ============================================
  // MÊME GÉNÉRATION, LIGNÉE DIRECTE = Frère/Sœur
  // ============================================
  if (deltaG === 0 && vectorUser.l === "direct" && vectorPerson.l === "direct") {
    // Même génération dans la famille directe
    if (vectorUser.g === -1 && vectorPerson.g === -1) {
      // Deux enfants du défunt = frères/sœurs
      const label = vectorPerson.s === "M" ? "Votre Frère" : vectorPerson.s === "F" ? "Votre Sœur" : "Votre Frère/Sœur";
      return { label, confidence: "high", colorClass: getColorClass(vectorPerson.l, vectorPerson.s) };
    }
    if (vectorUser.g === 0 && vectorPerson.g === 0) {
      // Frères/Sœurs du défunt = frères/sœurs
      const label = vectorPerson.s === "M" ? "Votre Frère" : vectorPerson.s === "F" ? "Votre Sœur" : "Votre Frère/Sœur";
      return { label, confidence: "high", colorClass: getColorClass(vectorPerson.l, vectorPerson.s) };
    }
  }

  // ============================================
  // ΔG = +1: Personne plus vieille d'une génération
  // ============================================
  if (deltaG === 1) {
    // Si user est enfant (G-1) et person est frère/sœur du défunt (G0) → Oncle/Tante
    if (vectorUser.g === -1 && vectorPerson.g === 0 && vectorUser.l === "direct" && vectorPerson.l === "direct") {
      const label = vectorPerson.s === "M" ? "Votre Oncle" : vectorPerson.s === "F" ? "Votre Tante" : "Votre Oncle/Tante";
      return { label, confidence: "high", colorClass: getColorClass(vectorPerson.l, vectorPerson.s) };
    }
    // Si user est enfant (G-1) et person est parent (G+1) → Grand-parent
    if (vectorUser.g === -1 && vectorPerson.g === 1 && vectorUser.l === "direct" && vectorPerson.l === "direct") {
      const label = vectorPerson.s === "M" ? "Votre Grand-père" : vectorPerson.s === "F" ? "Votre Grand-mère" : "Votre Grand-parent";
      return { label, confidence: "high", colorClass: getColorClass(vectorPerson.l, vectorPerson.s) };
    }
    // Parent générique
    if (vectorPerson.l === "direct") {
      const label = vectorPerson.s === "M" ? "Votre Père/Beau-père" : vectorPerson.s === "F" ? "Votre Mère/Belle-mère" : "Votre Parent";
      return { label, confidence: "medium", colorClass: getColorClass(vectorPerson.l, vectorPerson.s) };
    }
  }

  // ============================================
  // ΔG = -1: Personne plus jeune d'une génération
  // ============================================
  if (deltaG === -1) {
    // Si user est frère/sœur du défunt (G0) et person est enfant (G-1) → Neveu/Nièce
    if (vectorUser.g === 0 && vectorPerson.g === -1 && vectorUser.l === "direct" && vectorPerson.l === "direct") {
      const label = vectorPerson.s === "M" ? "Votre Neveu" : vectorPerson.s === "F" ? "Votre Nièce" : "Votre Neveu/Nièce";
      return { label, confidence: "high", colorClass: getColorClass(vectorPerson.l, vectorPerson.s) };
    }
    // Enfant générique
    if (vectorPerson.l === "direct") {
      const label = vectorPerson.s === "M" ? "Votre Fils/Beau-fils" : vectorPerson.s === "F" ? "Votre Fille/Belle-fille" : "Votre Enfant";
      return { label, confidence: "medium", colorClass: getColorClass(vectorPerson.l, vectorPerson.s) };
    }
  }

  // ============================================
  // ΔG = +2: Deux générations au-dessus
  // ============================================
  if (deltaG === 2) {
    if (vectorPerson.l === "direct") {
      const label = vectorPerson.s === "M" ? "Votre Grand-père" : vectorPerson.s === "F" ? "Votre Grand-mère" : "Votre Grand-parent";
      return { label, confidence: "medium", colorClass: getColorClass(vectorPerson.l, vectorPerson.s) };
    }
  }

  // ============================================
  // ΔG = -2: Deux générations en dessous
  // ============================================
  if (deltaG === -2) {
    if (vectorPerson.l === "direct") {
      const label = vectorPerson.s === "M" ? "Votre Petit-fils" : vectorPerson.s === "F" ? "Votre Petite-fille" : "Votre Petit-enfant";
      return { label, confidence: "medium", colorClass: getColorClass(vectorPerson.l, vectorPerson.s) };
    }
  }

  // ============================================
  // ALLIANCE: Époux/Épouse du défunt + Enfant
  // ============================================
  if (vectorUser.l === "direct" && vectorUser.g === -1 && vectorPerson.l === "alliance" && vectorPerson.g === 0) {
    // User est enfant, Person est époux/épouse → Parent
    const label = vectorPerson.s === "M" ? "Votre Père" : vectorPerson.s === "F" ? "Votre Mère" : "Votre Parent";
    return { label, confidence: "high", colorClass: getColorClass("alliance", vectorPerson.s) };
  }
  if (vectorPerson.l === "direct" && vectorPerson.g === -1 && vectorUser.l === "alliance" && vectorUser.g === 0) {
    // User est époux/épouse, Person est enfant → Enfant
    const label = vectorPerson.s === "M" ? "Votre Fils" : vectorPerson.s === "F" ? "Votre Fille" : "Votre Enfant";
    return { label, confidence: "high", colorClass: getColorClass(vectorPerson.l, vectorPerson.s) };
  }

  // ============================================
  // COUSINS (même génération, extended)
  // ============================================
  if (deltaG === 0 && vectorUser.l === "extended" && vectorPerson.l === "extended") {
    const label = vectorPerson.s === "M" ? "Votre Cousin" : vectorPerson.s === "F" ? "Votre Cousine" : "Votre Cousin(e)";
    return { label, confidence: "medium", colorClass: getColorClass(vectorPerson.l, vectorPerson.s) };
  }

  // ============================================
  // RELATION PAR ALLIANCE
  // ============================================
  if (vectorPerson.l === "alliance") {
    return { label: "Lié(e) par alliance", confidence: "medium", colorClass: getColorClass("alliance", vectorPerson.s) };
  }

  // ============================================
  // SOCIO-CŒUR
  // ============================================
  if (vectorPerson.l === "coeur") {
    return { label: "Proche du défunt", confidence: "low", colorClass: "text-muted-foreground" };
  }

  // ============================================
  // AUTRES
  // ============================================
  if (vectorPerson.l === "other") {
    return { label: "Connaissance", confidence: "low", colorClass: "text-muted-foreground" };
  }

  // Fallback: famille élargie
  if (vectorPerson.l === "direct" || vectorPerson.l === "extended") {
    return { label: "De la famille", confidence: "low", colorClass: getColorClass(vectorPerson.l, vectorPerson.s) };
  }

  return null;
};

// ============================================================================
// EXPORTS POUR COMPATIBILITÉ
// ============================================================================

export const getRelationshipData = () => relationVectors;

// ============================================================================
// GENRE-AWARE RELATION LABELS
// ============================================================================

const GENDERED_PAIRS: Record<string, string> = {
  'Fils': 'Fille', 'Frère': 'Sœur', 'Père': 'Mère',
  'Grand-père': 'Grand-mère', 'Petit-fils': 'Petite-fille',
  'Oncle': 'Tante', 'Neveu': 'Nièce', 'Cousin': 'Cousine',
  'Époux': 'Épouse', 'Gendre': 'Belle-fille',
  'Beau-père': 'Belle-mère', 'Beau-frère': 'Belle-sœur',
};

const INVERSE_RELATIONS: Record<string, string> = {
  'Fils': 'Père', 'Fille': 'Mère', 'Père': 'Fils', 'Mère': 'Fille',
  'Frère': 'Frère', 'Sœur': 'Sœur',
  'Grand-père': 'Petit-fils', 'Grand-mère': 'Petite-fille',
  'Petit-fils': 'Grand-père', 'Petite-fille': 'Grand-mère',
  'Oncle': 'Neveu', 'Tante': 'Nièce', 'Neveu': 'Oncle', 'Nièce': 'Tante',
  'Cousin': 'Cousin', 'Cousine': 'Cousine',
  'Époux': 'Épouse', 'Épouse': 'Époux',
};

// Base de données de prénoms féminins — francophones + gabonais + africains
const LIKELY_FEMININE = /^(marie|thérèse|therese|odile|claire|félicité|felicite|pauline|jeanne|catherine|rose|anne|lucie|sophie|emma|léa|lea|julie|alice|sarah|nathalie|sylvie|christine|monique|françoise|francoise|nicole|isabelle|patricia|caroline|florence|sandra|valérie|valerie|véronique|veronique|brigitte|cécile|cecile|hélène|helene|marguerite|antoinette|béatrice|beatrice|chantal|colette|denise|éliane|eliane|évelyne|evelyne|geneviève|genevieve|georgette|germaine|ghislaine|henriette|huguette|irène|irene|jacqueline|jocelyne|josiane|josette|laurence|liliane|madeleine|marcelle|martine|michèle|michele|mireille|nadine|pierrette|raymonde|renée|renee|simone|suzanne|yvette|yvonne|angèle|angele|bernadette|charlotte|constance|edith|eugénie|eugenie|fatou|félicie|felicie|gloria|grâce|grace|honorine|judith|laure|léontine|leontine|mabika|marthe|mathilde|modeste|ndong|noëlle|noelle|pascaline|perpétue|perpetue|philomène|philomene|priscille|régine|regine|solange|stéphanie|stephanie|viviane|virginie|yolande|zita|adèle|adele|agathe|aïssatou|aissatou|aminata|assala|bintou|célestine|celestine|clémence|clemence|diane|estelle|fatoumata|fernande|fidèle|fidele|gabrielle|hyacinthe|inès|ines|joséphine|josephine|justine|léonie|leonie|mabondi|mboumba|moussavou|ngoua|ntsame|obame|obone|ondo|oyane|sabine|scholastique|séraphine|seraphine|thècle|thecle|ursule|xavière|xaviere)/i;

// Base de données de prénoms masculins — francophones + gabonais + africains
const LIKELY_MASCULINE = /^(jean|pierre|paul|joseph|samuel|guy|roger|simplice|david|michel|jacques|philippe|andré|andre|louis|charles|henri|daniel|françois|francois|patrick|bernard|thierry|alain|marc|éric|eric|robert|richard|claude|yves|serge|gérard|gerard|georges|lucien|raymond|maurice|rené|rene|marcel|alfred|armand|augustin|émile|emile|etienne|gaston|gilbert|gustave|léon|leon|maxime|nicolas|olivier|pascal|quentin|raphaël|raphael|stéphane|stephane|sylvain|vincent|xavier|albert|alexandre|alphonse|ambroise|anatole|antoine|barthélémy|barthelemy|benjamin|célestin|celestin|clément|clement|cyrille|dieudonné|dieudonne|edgard|edouard|emmanuel|fabien|félix|felix|firmin|frédéric|frederic|gauthier|grégoire|gregoire|hilaire|honoré|honore|hyacinthe|ignace|isidore|julien|justin|lambert|lazare|léopold|leopold|magloire|mamadou|mathieu|moïse|moise|narcisse|nestor|norbert|oumar|parfait|prosper|rodrigue|sébastien|sebastien|silvère|silvere|théodore|theodore|timothée|timothee|valentin|wilfried|zacharie|biyoghe|koumba|mbigou|mvoula|ndong|nguema|nze|obame|ondo|ovono)/i;

// Terminaisons féminines communes (fallback si prénom non reconnu)
const FEMININE_ENDINGS = ['-ette', '-ine', '-elle', '-ice', '-ise', '-ence', '-ande', '-aine'];
const FEMININE_SUFFIX_REGEX = /(ette|ine|elle|ice|ise|ence|ande|aine|ia|ita|ila)$/i;

/**
 * Adapte un label de relation au genre du prénom donné.
 * Ex: getGenderAwareRelation("Fils", "Thérèse") → "Fille"
 */
/**
 * Infère le genre probable d'un prénom.
 * Retourne "F", "M" ou "N" (neutre/inconnu).
 * L'utilisateur peut toujours surcharger manuellement.
 */
export const inferGender = (firstName: string): Gender => {
  const cleanFirst = firstName.trim();
  
  // 1. Vérification dans les bases de prénoms connus
  if (LIKELY_FEMININE.test(cleanFirst)) return "F";
  if (LIKELY_MASCULINE.test(cleanFirst)) return "M";
  
  // 2. Fallback : terminaisons féminines communes
  if (FEMININE_SUFFIX_REGEX.test(cleanFirst.toLowerCase())) return "F";
  
  // 3. Prénoms ambigus (Claude, Dominique, Camille) → Neutre
  return "N";
};

/**
 * Fonction centrale d'accord grammatical.
 * Retourne le label de relation accordé au genre.
 * Ex: getRelationLabel("Fils", "F") → "Fille"
 * Ex: getRelationLabel("Père", "F") → "Mère"
 */
export const getRelationLabel = (relationType: string, gender: Gender): string => {
  if (gender === "F" && GENDERED_PAIRS[relationType]) {
    return GENDERED_PAIRS[relationType];
  }
  const reverseMap = Object.fromEntries(Object.entries(GENDERED_PAIRS).map(([m, f]) => [f, m]));
  if (gender === "M" && reverseMap[relationType]) {
    return reverseMap[relationType];
  }
  return relationType;
};

/**
 * Adapte un label de relation au genre du prénom donné.
 * Ex: getGenderAwareRelation("Fils", "Thérèse") → "Fille"
 */
export const getGenderAwareRelation = (relationType: string, firstName: string): string => {
  const gender = inferGender(firstName);
  if (gender === "N") return relationType;
  return getRelationLabel(relationType, gender);
};

/**
 * Inverse une relation et l'accorde au genre du prénom cible.
 * Ex: getInverseRelation("Fils", "Samuel") → "Père"
 */
export const getInverseRelation = (relationType: string, targetFirstName: string): string => {
  const inverse = INVERSE_RELATIONS[relationType];
  if (inverse) {
    return getGenderAwareRelation(inverse, targetFirstName);
  }
  return relationType;
};
