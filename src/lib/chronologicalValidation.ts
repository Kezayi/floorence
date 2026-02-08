// ============================================================================
// CONTRÔLEUR DE COHÉRENCE CHRONOLOGIQUE
// Vérifie la validité biologique des liens inter-mémoriaux
// ============================================================================

/** Relations parentales (ascendantes) : le "parent" doit être né avant l'enfant */
const PARENT_RELATIONS = ["Père", "Mère", "Grand-père", "Grand-mère", "Arrière-grand-père", "Arrière-grand-mère"];
/** Relations filiales (descendantes) : le "fils" doit être né après le parent */
const CHILD_RELATIONS = ["Fils", "Fille", "Petit-fils", "Petite-fille", "Arrière-petit-fils", "Arrière-petite-fille"];
/** Relations de fratrie : écart raisonnable */
const SIBLING_RELATIONS = ["Frère", "Sœur"];
/** Relations oncle/tante */
const UNCLE_RELATIONS = ["Oncle", "Tante"];
/** Relations neveu/nièce */
const NEPHEW_RELATIONS = ["Neveu", "Nièce"];

/** Écarts minimaux en années par type de relation */
const MIN_GENERATION_GAP = 15;  // Écart minimal parent-enfant
const MIN_GRAND_GAP = 30;       // Écart minimal grand-parent
const MIN_GREAT_GRAND_GAP = 45; // Écart minimal arrière-grand-parent
const MAX_SIBLING_GAP = 30;     // Écart maximal entre frères/sœurs

export interface ChronologicalValidation {
  isValid: boolean;
  isVerified: boolean; // Les dates confirment biologiquement le lien
  message: string | null;
  details: string | null;
}

/**
 * Calcule l'écart en années entre deux dates
 */
const yearsBetween = (earlier: Date, later: Date): number => {
  let years = later.getFullYear() - earlier.getFullYear();
  const monthDiff = later.getMonth() - earlier.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && later.getDate() < earlier.getDate())) {
    years--;
  }
  return years;
};

/**
 * Valide la cohérence chronologique d'un lien inter-mémoriaux.
 * 
 * @param sourceBirthDate Date de naissance du mémorial source (celui "qui est" le lien)
 * @param targetBirthDate Date de naissance du mémorial cible
 * @param relationType Le type de relation (ex: "Père", "Fils", "Frère")
 * @returns Résultat de la validation
 * 
 * Convention: "[Source] est [relationType] de [Target]"
 * Ex: "Thérèse est Fille de Samuel" → source=Thérèse, target=Samuel
 */
export const validateChronologicalCoherence = (
  sourceBirthDate: string | null | undefined,
  targetBirthDate: string | null | undefined,
  relationType: string
): ChronologicalValidation => {
  // Si pas de dates, on ne peut pas valider
  if (!sourceBirthDate || !targetBirthDate) {
    return {
      isValid: true,
      isVerified: false,
      message: null,
      details: "Dates de naissance manquantes — vérification impossible",
    };
  }

  const sourceDate = new Date(sourceBirthDate);
  const targetDate = new Date(targetBirthDate);

  if (isNaN(sourceDate.getTime()) || isNaN(targetDate.getTime())) {
    return { isValid: true, isVerified: false, message: null, details: "Format de date invalide" };
  }

  const sourceIsOlder = sourceDate < targetDate;
  const gap = Math.abs(yearsBetween(
    sourceIsOlder ? sourceDate : targetDate,
    sourceIsOlder ? targetDate : sourceDate
  ));

  // ============================================================
  // RÈGLE : Source est PARENT de Target
  // Source doit être né AVANT Target avec au moins MIN_GENERATION_GAP
  // ============================================================
  if (PARENT_RELATIONS.includes(relationType)) {
    const isGrand = relationType.includes("Grand");
    const isGreat = relationType.includes("Arrière");
    const minGap = isGreat ? MIN_GREAT_GRAND_GAP : isGrand ? MIN_GRAND_GAP : MIN_GENERATION_GAP;

    if (!sourceIsOlder) {
      return {
        isValid: false,
        isVerified: false,
        message: `Impossible : Un ${relationType} ne peut pas être né après son enfant.`,
        details: `L'ordre biologique des générations n'est pas respecté.`,
      };
    }

    if (gap < minGap) {
      return {
        isValid: false,
        isVerified: false,
        message: `Impossible : L'écart d'âge est de ${gap} ans, minimum requis : ${minGap} ans pour un lien "${relationType}".`,
        details: `L'ordre biologique des générations n'est pas respecté (écart < ${minGap} ans).`,
      };
    }

    return {
      isValid: true,
      isVerified: true,
      message: null,
      details: `Écart de ${gap} ans — cohérent pour un lien "${relationType}"`,
    };
  }

  // ============================================================
  // RÈGLE : Source est ENFANT de Target
  // Source doit être né APRÈS Target avec au moins MIN_GENERATION_GAP
  // ============================================================
  if (CHILD_RELATIONS.includes(relationType)) {
    const isGrand = relationType.includes("Petit");
    const isGreat = relationType.includes("Arrière");
    const minGap = isGreat ? MIN_GREAT_GRAND_GAP : isGrand ? MIN_GRAND_GAP : MIN_GENERATION_GAP;

    if (sourceIsOlder) {
      return {
        isValid: false,
        isVerified: false,
        message: `Impossible : Un ${relationType} ne peut pas être né avant son parent.`,
        details: `L'ordre biologique des générations n'est pas respecté.`,
      };
    }

    if (gap < minGap) {
      return {
        isValid: false,
        isVerified: false,
        message: `Impossible : L'écart d'âge est de ${gap} ans, minimum requis : ${minGap} ans pour un lien "${relationType}".`,
        details: `L'ordre biologique des générations n'est pas respecté (écart < ${minGap} ans).`,
      };
    }

    return {
      isValid: true,
      isVerified: true,
      message: null,
      details: `Écart de ${gap} ans — cohérent pour un lien "${relationType}"`,
    };
  }

  // ============================================================
  // RÈGLE : Fratrie
  // Écart raisonnable (< MAX_SIBLING_GAP)
  // ============================================================
  if (SIBLING_RELATIONS.includes(relationType)) {
    if (gap > MAX_SIBLING_GAP) {
      return {
        isValid: false,
        isVerified: false,
        message: `Improbable : ${gap} ans d'écart entre frère et sœur (maximum ${MAX_SIBLING_GAP} ans).`,
        details: `Écart de ${gap} ans peu probable pour une fratrie.`,
      };
    }

    return {
      isValid: true,
      isVerified: gap <= 20,
      message: null,
      details: `Écart de ${gap} ans — cohérent pour une fratrie`,
    };
  }

  // ============================================================
  // RÈGLE : Oncle/Tante — devrait être de la génération au-dessus
  // ============================================================
  if (UNCLE_RELATIONS.includes(relationType)) {
    // L'oncle/tante (source) devrait être plus âgé que le neveu (target) en général
    // mais pas obligatoire biologiquement (oncle peut être plus jeune que neveu)
    return {
      isValid: true,
      isVerified: gap >= 5,
      message: null,
      details: `Écart de ${gap} ans`,
    };
  }

  // ============================================================
  // RÈGLE : Neveu/Nièce — devrait être de la génération en dessous
  // ============================================================
  if (NEPHEW_RELATIONS.includes(relationType)) {
    return {
      isValid: true,
      isVerified: gap >= 5,
      message: null,
      details: `Écart de ${gap} ans`,
    };
  }

  // ============================================================
  // Relations d'alliance (Époux/Épouse) : pas de contrainte stricte
  // ============================================================
  return {
    isValid: true,
    isVerified: !!sourceBirthDate && !!targetBirthDate,
    message: null,
    details: gap > 0 ? `Écart de ${gap} ans` : null,
  };
};

/**
 * Vérifie si un lien existant est "vérifié" par les dates de naissance.
 * Simplifié pour usage dans les badges d'affichage.
 */
export const isRelationBiologicallyVerified = (
  sourceBirthDate: string | null | undefined,
  targetBirthDate: string | null | undefined,
  relationType: string
): boolean => {
  const result = validateChronologicalCoherence(sourceBirthDate, targetBirthDate, relationType);
  return result.isVerified;
};
