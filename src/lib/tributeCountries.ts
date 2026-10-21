import { supabase } from "@/integrations/supabase/client";
import { isIsoCountry } from "@/lib/geoLands";

/**
 * GEO-02 — Attaches the publicly consented country to visible tributes.
 * The server only returns countries stored with explicit consent; failures degrade to "no country".
 */
export async function attachTributeCountries<T extends { id: string }>(posts: T[]): Promise<(T & { author_country_code: string | null })[]> {
  const ids = posts.map((p) => p.id).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  const map = new Map<string, string>();
  if (ids.length) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.rpc as any)("get_public_tribute_countries", { p_post_ids: ids.slice(0, 200) });
      for (const r of (data || []) as { id: string; country_code: string }[]) {
        if (isIsoCountry(r.country_code)) map.set(r.id, r.country_code);
      }
    } catch { /* degrade silently */ }
  }
  return posts.map((p) => ({ ...p, author_country_code: map.get(p.id) ?? null }));
}
