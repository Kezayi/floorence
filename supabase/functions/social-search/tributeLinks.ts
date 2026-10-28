/**
 * Structured contributor ↔ deceased declarations for the memorials validated as sources of THIS answer.
 * Grouped per contributor account (user_id never leaves the server). Same normalized author name carried
 * by several accounts or by anonymous posts on one memorial => "ambiguous" (no identity guess).
 */
interface PostRow { memorial_id: string; user_id: string | null; author_name: string | null; relation_link: string | null }

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("fr").replace(/\s+/g, " ").trim();

export function tributeLinks(posts: readonly PostRow[], memorialIds: readonly string[]) {
  const cited = new Set(memorialIds);
  const groups = new Map<string, { memorial_id: string; author: string; accounts: Set<string>; anon: boolean; links: Set<string> }>();
  for (const p of posts) {
    if (!cited.has(p.memorial_id) || !p.author_name?.trim()) continue;
    const key = `${p.memorial_id}|${norm(p.author_name)}`;
    const g = groups.get(key) ?? { memorial_id: p.memorial_id, author: p.author_name.trim(), accounts: new Set(), anon: false, links: new Set() };
    if (p.user_id) g.accounts.add(p.user_id); else g.anon = true;
    if (p.relation_link?.trim()) g.links.add(p.relation_link.trim().slice(0, 120));
    groups.set(key, g);
  }
  return [...groups.values()].filter((g) => g.links.size > 0).slice(0, 300).map((g) => ({
    memorial_id: g.memorial_id, author: g.author,
    identity: g.accounts.size === 1 && !g.anon ? "unique" : "ambiguous",
    links: [...g.links],
  }));
}
