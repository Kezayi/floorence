// ============================================================================
// RIBENGA-08 — Synthèse relationnelle déterministe (Lignage × Maillage × Terres)
// Aucune IA, aucune inférence de filiation, aucun scoring. Chaque affirmation
// porte sa nature (fait enregistré / déclaration acceptée / confirmations /
// hypothèse conditionnée) et sa source. Toute donnée absente = « non étayé ».
// ============================================================================

import { countryName } from "./geoLands";

export type ScopeStatementKind =
  | "fact"
  | "declaration"
  | "confirmation"
  | "hypothesis"
  | "unsubstantiated";

export interface ScopeStatement {
  kind: ScopeStatementKind;
  text: string;
  source: string;
}

export const KIND_LABELS: Record<ScopeStatementKind, string> = {
  fact: "Fait enregistré",
  declaration: "Lien déclaré et accepté",
  confirmation: "Confirmations",
  hypothesis: "Hypothèse conditionnée",
  unsubstantiated: "Non étayé",
};

export interface MemorialLands {
  origin_country: string | null;
  origin_locality: string | null;
  residence_country: string | null;
  residence_locality: string | null;
  burial_country: string | null;
  burial_locality: string | null;
}

export interface ScopeInput {
  masterName: string;
  /** null = lecture indisponible (erreur) ; terres vides = rien de déclaré */
  masterLands: MemorialLands | null;
  /** relation_id canoniques acceptés touchant le mémorial (un lien = un id) */
  directRelationIds: string[];
  /** mémoriaux distincts reliés directement */
  directLinkedCount: number;
  /** null = lignage indisponible */
  lineageCount: number | null;
  /** total des confirmations des liens directs ; null = indisponible (jamais de faux 0) */
  confirmationsTotal: number | null;
  /** mémoriaux atteignables par chemins avérés (tous sauts, directs inclus) */
  reachableCount: number;
  /** terres déclarées distinctes parmi les mémoriaux atteignables */
  reachableLandNames: string[];
}

const formatLand = (
  label: string,
  country: string | null,
  locality: string | null,
): string | null => {
  if (!country && !locality) return null;
  const place = [locality, country ? countryName(country) : null]
    .filter(Boolean)
    .join(", ");
  return place ? `${label} : ${place}` : null;
};

export function buildRelationalScope(input: ScopeInput): ScopeStatement[] {
  const statements: ScopeStatement[] = [];

  // 1. Terres du défunt — fait enregistré, ou manque explicite
  if (!input.masterLands) {
    statements.push({
      kind: "unsubstantiated",
      text: "Terres du défunt indisponibles.",
      source: "Terres déclarées du mémorial",
    });
  } else {
    const lands = [
      formatLand("Origine", input.masterLands.origin_country, input.masterLands.origin_locality),
      formatLand("Résidence", input.masterLands.residence_country, input.masterLands.residence_locality),
      formatLand("Sépulture", input.masterLands.burial_country, input.masterLands.burial_locality),
    ].filter((l): l is string => !!l);
    statements.push(
      lands.length === 0
        ? {
            kind: "unsubstantiated",
            text: `Aucune terre déclarée pour ${input.masterName}.`,
            source: "Terres déclarées du mémorial",
          }
        : { kind: "fact", text: lands.join(" · "), source: "Terres déclarées du mémorial" },
    );
  }

  // 2. Liens déclarés et acceptés — chaque relation_id compte pour un lien
  const n = input.directRelationIds.length;
  if (n === 0) {
    statements.push({
      kind: "unsubstantiated",
      text: "Aucun lien accepté avec un autre mémorial.",
      source: "Pont des Ancêtres (liens acceptés)",
    });
  } else {
    const m = input.directLinkedCount;
    statements.push({
      kind: "declaration",
      text: `${n} lien${n > 1 ? "s" : ""} déclaré${n > 1 ? "s" : ""} et accepté${n > 1 ? "s" : ""} avec ${m} mémorial${m > 1 ? "aux" : ""}.`,
      source: "Pont des Ancêtres (liens acceptés)",
    });
  }

  // 3. Lignage — sous-ensemble déclaré, ou indisponible
  if (input.lineageCount === null) {
    statements.push({
      kind: "unsubstantiated",
      text: "Lignage indisponible.",
      source: "Arbre de lignage",
    });
  } else if (input.lineageCount > 0) {
    statements.push({
      kind: "declaration",
      text: `Dont ${input.lineageCount} lien${input.lineageCount > 1 ? "s" : ""} de lignée accepté${input.lineageCount > 1 ? "s" : ""}.`,
      source: "Arbre de lignage",
    });
  }

  // 4. Confirmations — témoignages personnels, jamais des preuves
  if (input.confirmationsTotal === null) {
    statements.push({
      kind: "unsubstantiated",
      text: "Confirmations indisponibles.",
      source: "Témoignages de confirmation",
    });
  } else if (n > 0) {
    statements.push({
      kind: "confirmation",
      text:
        input.confirmationsTotal > 0
          ? `Ces liens ont reçu ${input.confirmationsTotal} confirmation${input.confirmationsTotal > 1 ? "s" : ""} au total — témoignages personnels, pas des preuves.`
          : "Aucune confirmation reçue pour l'instant sur ces liens.",
      source: "Témoignages de confirmation",
    });
  }

  // 5. Portée relationnelle — hypothèse conditionnée aux seuls chemins avérés
  const beyondDirect = input.reachableCount - input.directLinkedCount;
  if (beyondDirect > 0) {
    const k = input.reachableLandNames.length;
    const landsTxt =
      k > 0
        ? `, touchant ${k} terre${k > 1 ? "s" : ""} déclarée${k > 1 ? "s" : ""} (${input.reachableLandNames.join(", ")})`
        : "";
    statements.push({
      kind: "hypothesis",
      text: `À travers les chemins avérés, la portée relationnelle pourrait s'étendre jusqu'à ${input.reachableCount} mémoriaux reliés${landsTxt}. Hypothèse conditionnée aux seuls liens acceptés.`,
      source: "Chemins relationnels vérifiés",
    });
  } else if (n > 0) {
    statements.push({
      kind: "unsubstantiated",
      text: "Portée au-delà des liens directs non étayée.",
      source: "Chemins relationnels vérifiés",
    });
  }

  return statements;
}
