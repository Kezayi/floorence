import { useMemo } from "react";

/**
 * Sanitise une chaîne contre les injections XSS basiques.
 */
function sanitize(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Hook de post-processing sémantique : nettoie le relation_link brut
 * et retourne un libellé formel sécurisé ("Fils du Défunt").
 */
export function useFormattedRelation(
  relationLink: string | null | undefined,
  deceasedGender: "male" | "female" = "male"
): string {
  return useMemo(() => {
    if (!relationLink) return "";

    // 1. Strip possessive pronouns
    let cleaned = relationLink.replace(/^(Son|Sa|So|Ses)\s+/i, "");

    // 2. Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    // 3. Add gendered suffix
    const suffix = deceasedGender === "female" ? "de la Défunte" : "du Défunt";

    // 4. XSS sanitization
    return sanitize(`${cleaned} ${suffix}`);
  }, [relationLink, deceasedGender]);
}
