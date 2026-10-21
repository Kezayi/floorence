import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CountryFlag from "./CountryFlag";
import { normalizeTributeGeography, type TributeGeography as Geo } from "@/lib/tributeGeography";

const VISIBLE = 5;
const plural = (n: number, s: string, p = s + "s") => `${n} ${n > 1 ? p : s}`;

// GEO-03 — « La géographie des hommages » : server aggregate of consented countries only; no cache.
const TributeGeography = ({ memorialId, refreshKey }: { memorialId?: string; refreshKey?: number }) => {
  const [geo, setGeo] = useState<Geo | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!memorialId || !/^[0-9a-f-]{36}$/i.test(memorialId)) { setGeo(null); return; }
    let alive = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)("get_memorial_tribute_geography", { p_memorial_id: memorialId })
      .then(({ data, error }: { data: unknown; error: unknown }) => { if (alive) setGeo(error ? null : normalizeTributeGeography(data)); });
    return () => { alive = false; };
  }, [memorialId, refreshKey]);

  if (!geo) return null;
  const rows = expanded ? geo.rows : geo.rows.slice(0, VISIBLE);

  return (
    <section aria-labelledby="geo-hommages-title" className="mb-10 border-y border-border/60 py-6">
      <h3 id="geo-hommages-title" className="font-serif text-xl text-livreor-foreground mb-1">La géographie des hommages</h3>
      <p className="text-xs font-sans text-livreor-muted mb-5">
        {plural(geo.countries, "pays", "pays")} représenté{geo.countries > 1 ? "s" : ""} · {plural(geo.contributors, "contributeur")} · {plural(geo.tributes, "hommage")} de provenance déclarée
      </p>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.code} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <CountryFlag code={r.code} size="md" fallback />
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-serif text-base text-livreor-foreground truncate">{r.name}</span>
              </div>
              <div className="mt-1 h-px bg-border/60" aria-hidden="true">
                <div className="h-px bg-champagne" style={{ width: `${Math.max(6, r.share * 100)}%` }} />
              </div>
            </div>
            <span className="text-xs font-sans text-livreor-muted text-right whitespace-nowrap">
              {plural(r.contributors, "contributeur")}
              <span className="block text-[10px] opacity-80">{plural(r.tributes, "hommage")}</span>
            </span>
          </li>
        ))}
      </ul>
      {geo.rows.length > VISIBLE && (
        <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}
          className="mt-4 text-xs font-sans text-livreor-muted underline underline-offset-4 hover:text-livreor-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm">
          {expanded ? "Afficher moins" : `Voir les ${geo.rows.length - VISIBLE} autres pays`}
        </button>
      )}
    </section>
  );
};

export default TributeGeography;
