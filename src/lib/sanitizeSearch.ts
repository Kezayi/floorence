/**
 * Sanitize user input for use in Supabase .ilike() / .or() filters.
 * Escapes SQL wildcards (%, _) and backslashes to prevent injection
 * via pattern-matching operators.
 */
export const sanitizeSearchInput = (input: string): string => {
  return input
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/%/g, '\\%')     // Escape percent
    .replace(/_/g, '\\_');    // Escape underscore
};
