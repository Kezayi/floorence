// Liste centralisée des noms interdits pour la plateforme
// Ces noms sont bloqués pour empêcher l'usurpation d'identité administrative

export const FORBIDDEN_NAMES = [
  'super admin',
  'admin',
  'administrateur',
  'test',
  'utilisateur',
  'anonymous',
  'anonyme',
  'system',
  'système',
  'modérateur',
  'moderateur',
  'moderator',
  'floorence',
  'support',
  'helpdesk',
];

/**
 * Vérifie si un nom contient un terme interdit.
 * @returns Le terme interdit trouvé, ou null si le nom est valide.
 */
export const checkForbiddenName = (name: string): string | null => {
  const normalizedName = name.toLowerCase().trim();
  for (const forbidden of FORBIDDEN_NAMES) {
    if (normalizedName.includes(forbidden)) {
      return forbidden;
    }
  }
  return null;
};

/**
 * Valide un nom d'affichage (longueur, format, noms interdits).
 * @returns Un message d'erreur, ou null si le nom est valide.
 */
export const validateDisplayName = (name: string): string | null => {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return "Le nom est obligatoire";
  }
  
  if (trimmed.length < 2) {
    return "Le nom doit contenir au moins 2 caractères";
  }
  
  if (trimmed.length > 100) {
    return "Le nom ne doit pas dépasser 100 caractères";
  }
  
  const forbidden = checkForbiddenName(trimmed);
  if (forbidden) {
    return `Le nom "${forbidden}" n'est pas autorisé. Veuillez utiliser votre vrai nom.`;
  }
  
  return null;
};
