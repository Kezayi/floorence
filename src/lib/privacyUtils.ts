/**
 * Privacy utility — Name obfuscation for public-facing UI
 * 
 * Transforms "Joseph Igouwe" → "J. IGO…"
 * Transforms "Marie Claire Moubamba" → "M. MOU…"
 * 
 * Used to protect identity in public contexts (anonymous visitors,
 * graph tooltips, URLs) while preserving family recognition.
 */

/**
 * Masks a full name into an obfuscated form: "Prénom Nom" → "P. NOM…"
 * Shows first initial + first 3 chars of last name in uppercase.
 */
export const maskName = (name: string): string => {
  if (!name || name.trim().length === 0) return "Anonyme";
  
  const parts = name.trim().split(/\s+/);
  
  if (parts.length === 1) {
    // Single name: "Joseph" → "J…"
    const n = parts[0];
    return n.length <= 2 ? n.toUpperCase() : `${n.charAt(0).toUpperCase()}…`;
  }
  
  // Multiple parts: take first initial + truncated last name
  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastName = parts[parts.length - 1];
  const truncatedLast = lastName.length <= 3
    ? lastName.toUpperCase()
    : `${lastName.substring(0, 3).toUpperCase()}…`;
  
  return `${firstInitial}. ${truncatedLast}`;
};

/**
 * Returns the full name if authenticated, masked version otherwise.
 */
export const displayName = (name: string, isAuthenticated: boolean): string => {
  return isAuthenticated ? name : maskName(name);
};
