/**
 * Deterministic demo avatar assignment for guestbook authors without a user account.
 * Uses existing demo portrait images from public/demo-portraits/.
 */

const DEMO_PORTRAITS = [
  "/demo-portraits/felicite-ntsame.jpg",
  "/demo-portraits/guy-roger-diallo.jpg",
  "/demo-portraits/jean-pierre-obame.jpg",
  "/demo-portraits/joseph-igouwe.jpg",
  "/demo-portraits/marie-claire-moubamba.jpg",
  "/demo-portraits/odile-mbigou.jpg",
  "/demo-portraits/paul-biyoghe.jpg",
  "/demo-portraits/samuel-ndong.jpg",
  "/demo-portraits/simplice-koumba.jpg",
  "/demo-portraits/therese-mvoula.jpg",
];

/** Female first names used in demo data */
const FEMALE_FIRST_NAMES = new Set([
  "amina", "bernadette", "edwige", "grâce", "grace", "marquise",
  "nadège", "nadege", "paulette", "prisca", "sandrine", "solange",
  "tatiana", "thérèse", "therese",
]);

/** Female portrait indices */
const FEMALE_INDICES = [0, 4, 5, 9]; // felicite, marie-claire, odile, therese
const MALE_INDICES = [1, 2, 3, 6, 7, 8]; // guy-roger, jean-pierre, joseph, paul, samuel, simplice

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/**
 * Returns a deterministic demo avatar URL for a given author name.
 * Gender is inferred from first name to pick appropriate portraits.
 */
export function getDemoAvatarUrl(authorName: string): string {
  const firstName = authorName.split(" ")[0]?.toLowerCase() || "";
  const isFemale = FEMALE_FIRST_NAMES.has(firstName);
  const pool = isFemale ? FEMALE_INDICES : MALE_INDICES;
  const index = pool[hashName(authorName) % pool.length];
  return DEMO_PORTRAITS[index];
}
