/**
 * Détecte le genre probable d'un prénom gabonais / francophone.
 * Retourne 'female' si le prénom est reconnu féminin, 'male' sinon.
 */

const FEMALE_NAMES = new Set([
  // Prénoms gabonais / d'Afrique centrale courants
  "adèle", "agathe", "agnès", "aimée", "albertine", "alice", "alphonsine",
  "amandine", "amélie", "anastasie", "angèle", "angélique", "anne", "antoinette",
  "arlette", "ariane", "aurélie", "béatrice", "bernadette", "berthe", "brigitte",
  "camille", "caroline", "carine", "catherine", "cécile", "célestine", "charlotte",
  "chantal", "christelle", "christiane", "christine", "claire", "clarisse", "claudine",
  "clémence", "clémentine", "colette", "constance", "corinne", "danielle", "delphine",
  "denise", "diane", "dorothée", "edith", "edwige", "éliane", "élisabeth", "élodie",
  "éloise", "émilienne", "emma", "ernestine", "esther", "eugénie", "eulalie",
  "évelyne", "fabienne", "fatoumata", "félicité", "félicienne", "fernande",
  "flore", "florence", "florentine", "francine", "françoise", "gabrielle",
  "geneviève", "georgette", "georgine", "germaine", "ghislaine", "ginette",
  "gisèle", "grâce", "henriette", "hortense", "huguette", "ida", "irène",
  "isabelle", "jacqueline", "janine", "jeanne", "jocelyne", "joséphine",
  "judith", "julienne", "justine", "laetitia", "laurence", "léonie", "liliane",
  "louise", "lucie", "lucienne", "lydie", "madeleine", "magali", "magalie",
  "marcelle", "marguerite", "marianne", "marie", "marthe", "martine", "mathilde",
  "mélanie", "micheline", "michelle", "modeste", "monique", "murielle", "nadège",
  "nadine", "nathalie", "nicole", "noëlle", "odette", "odile", "olive",
  "olga", "pascaline", "patience", "patricia", "paulette", "pauline", "perpétue",
  "philomène", "pierrette", "prisca", "prudence", "rachel", "raymonde", "régine",
  "reine", "renée", "rita", "rolande", "rose", "rosalie", "rosine",
  "ruth", "sabine", "sandrine", "scholastique", "séraphine", "silvie", "simone",
  "solange", "sophie", "stéphanie", "suzanne", "sylvie", "thérèse", "valentine",
  "valérie", "véronique", "victoire", "virginie", "viviane", "yolande", "yvette",
  "yvonne", "zoé",
  // Variantes sans accents (pour matching)
  "therese", "felicite", "amelie", "cecile", "celestine", "clemence",
  "clementine", "eliane", "elisabeth", "elodie", "eloise", "emilienne",
  "eugenie", "evelyne", "genevieve", "helene", "irene", "leonie",
  "melanie", "noemie", "noelle", "regine", "renee", "seraphine",
  "stephanie", "valerie", "veronique",
]);

/** Suffixes fortement indicateurs du féminin en contexte francophone/gabonais */
const FEMALE_SUFFIXES = ["ette", "elle", "ine", "ise", "ienne", "ande", "aine"];

export function inferGender(firstName: string): 'male' | 'female' {
  if (!firstName) return 'male';

  const normalized = firstName.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // strip accents for lookup

  // Also check the original lowercased (with accents)
  const withAccents = firstName.trim().toLowerCase();

  if (FEMALE_NAMES.has(normalized) || FEMALE_NAMES.has(withAccents)) {
    return 'female';
  }

  // Heuristic: common feminine suffixes
  for (const suffix of FEMALE_SUFFIXES) {
    if (normalized.endsWith(suffix)) {
      return 'female';
    }
  }

  return 'male';
}
