// French month names for date parsing
const frenchMonths: { [key: string]: number } = {
  "janvier": 0, "février": 1, "mars": 2, "avril": 3,
  "mai": 4, "juin": 5, "juillet": 6, "août": 7,
  "septembre": 8, "octobre": 9, "novembre": 10, "décembre": 11
};

/**
 * Parse a French date string like "12 Mars 1945" to a Date object
 */
export const parseFrenchDate = (dateStr: string): Date | null => {
  const parts = dateStr.toLowerCase().split(" ");
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0]);
  const month = frenchMonths[parts[1]];
  const year = parseInt(parts[2]);
  
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  
  return new Date(year, month, day);
};

/**
 * Calculate age at death from birth and death dates
 */
export const calculateAge = (birthDateStr: string, deathDateStr: string): number | null => {
  const birthDate = parseFrenchDate(birthDateStr);
  const deathDate = parseFrenchDate(deathDateStr);
  
  if (!birthDate || !deathDate) return null;
  
  let age = deathDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = deathDate.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && deathDate.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Determine if a memorial is "RECENT" or "PAST" based on death date.
 * Rule: Death within the last 6 months = RECENT, otherwise PAST
 */
export const getMemorialType = (deathDateStr: string): "RECENT" | "PAST" => {
  const deathDate = parseFrenchDate(deathDateStr);
  
  if (!deathDate) return "PAST"; // Default to PAST if date can't be parsed
  
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  return deathDate >= sixMonthsAgo ? "RECENT" : "PAST";
};

/**
 * Calculate the number of months since death
 */
export const getMonthsSinceDeath = (deathDateStr: string): number | null => {
  const deathDate = parseFrenchDate(deathDateStr);
  
  if (!deathDate) return null;
  
  const now = new Date();
  const months = (now.getFullYear() - deathDate.getFullYear()) * 12 + 
                 (now.getMonth() - deathDate.getMonth());
  
  return Math.max(0, months);
};

/**
 * Format an ISO date or Date object to French date string like "12 Mars 1945"
 */
export const formatDateFrench = (date: string | Date | null): string => {
  if (!date) return "";
  
  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  
  return `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
};
