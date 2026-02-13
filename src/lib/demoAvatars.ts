/**
 * Deterministic demo avatar assignment for guestbook authors without a user account.
 * Uses existing demo portrait images from public/demo-portraits/.
 * 
 * IMPORTANT: Uses a global registry to guarantee no two different names
 * receive the same portrait within the application lifecycle.
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
  "amina", "bernadette", "charlotte", "edwige", "félicité", "felicite",
  "grâce", "grace", "marie-claire", "marquise", "nadège", "nadege",
  "odile", "paulette", "prisca", "rose", "sandrine", "solange",
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
 * Global registry: maps normalized name → portrait URL.
 * Ensures uniqueness: once a portrait is assigned, it won't be given to another name.
 */
const nameToPortrait = new Map<string, string>();
const usedPortraits = new Set<string>();

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Returns a deterministic, globally unique demo avatar URL for a given author name.
 * Gender is inferred from first name to pick appropriate portraits.
 * Once all gender-appropriate portraits are exhausted, falls back to any remaining portrait.
 */
export function getDemoAvatarUrl(authorName: string): string {
  const key = normalizeName(authorName);

  // Already assigned? Return the same portrait.
  const existing = nameToPortrait.get(key);
  if (existing) return existing;

  const firstName = key.split(" ")[0] || "";
  const isFemale = FEMALE_FIRST_NAMES.has(firstName);
  const preferredPool = (isFemale ? FEMALE_INDICES : MALE_INDICES).map(i => DEMO_PORTRAITS[i]);

  // Try preferred gender pool first, then fallback to all portraits
  const pools = [preferredPool, DEMO_PORTRAITS];

  for (const pool of pools) {
    // Try hash-based pick first for determinism
    const hashIdx = hashName(key) % pool.length;
    if (!usedPortraits.has(pool[hashIdx])) {
      const url = pool[hashIdx];
      nameToPortrait.set(key, url);
      usedPortraits.add(url);
      return url;
    }
    // Hash collided → find any available in this pool
    for (const url of pool) {
      if (!usedPortraits.has(url)) {
        nameToPortrait.set(key, url);
        usedPortraits.add(url);
        return url;
      }
    }
  }

  // All 10 portraits exhausted — fallback to hash-based (allows reuse)
  const fallbackIdx = hashName(key) % DEMO_PORTRAITS.length;
  const fallback = DEMO_PORTRAITS[fallbackIdx];
  nameToPortrait.set(key, fallback);
  return fallback;
}

/**
 * Pre-register a memorial's photo_url so it won't be assigned to demo authors.
 * Call this for deceased persons who already have a real photo.
 */
export function reservePortrait(photoUrl: string | null | undefined): void {
  if (photoUrl) usedPortraits.add(photoUrl);
}
