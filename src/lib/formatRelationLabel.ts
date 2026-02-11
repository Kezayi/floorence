/**
 * Supprime les pronoms possessifs en début de relation et ajoute le suffixe "du Défunt / de la Défunte".
 * Ex: "Son Fils" → "Fils du Défunt", "Sa Mère" → "Mère de la Défunte"
 */
export function formatRelationLabel(
  rawRelation: string,
  gender: 'male' | 'female' = 'male'
): string {
  if (!rawRelation) return rawRelation;

  // Strip leading possessive pronouns (Son, Sa, So, Ses)
  let cleaned = rawRelation.replace(/^(Son|Sa|So|Ses)\s+/i, '');

  // Ensure first letter is uppercase after stripping
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  const suffix = gender === 'female' ? 'de la Défunte' : 'du Défunt';

  return `${cleaned} ${suffix}`;
}
