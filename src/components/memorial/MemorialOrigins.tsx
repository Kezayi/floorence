import CountryFlag from "./CountryFlag";
import { BURIAL_STATUS_LABELS, countryName, hasAnyGeo, type GeoLands } from "@/lib/geoLands";

const Land = ({ title, country, locality, note }: { title: string; country: string | null; locality: string | null; note?: string }) => {
  if (!country && !locality) return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs font-sans uppercase tracking-wider text-muted-foreground mb-1">{title}</dt>
      <dd className="font-serif text-base text-foreground flex flex-wrap items-center gap-2">
        {country && <CountryFlag code={country} />}
        <span className="break-words">{[locality, country ? countryName(country) : null].filter(Boolean).join(", ")}</span>
      </dd>
      {note && <dd className="text-xs font-sans text-muted-foreground mt-1 italic">{note}</dd>}
    </div>
  );
};

const MemorialOrigins = ({ geo }: { geo: GeoLands }) => {
  if (!hasAnyGeo(geo)) return null;
  // A planned burial is never presented as confirmed; missing status stays neutral.
  const burialNote = geo.burial_status === "done" ? BURIAL_STATUS_LABELS.done
    : geo.burial_status === "planned" ? "Inhumation prévue — non encore confirmée"
    : "Statut de l'inhumation non déterminé";
  const burialTitle = geo.burial_status === "done" ? "Terre finale" : "Terre finale (prévue ou à confirmer)";
  return (
    <section aria-labelledby="origins-title" className="border border-border rounded-sm p-5 md:p-6">
      <h3 id="origins-title" className="font-serif text-xl mb-4">Origines et dernier repos</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Land title="Terre originelle" country={geo.origin_country} locality={geo.origin_locality} />
        <Land title="Terre de vie" country={geo.residence_country} locality={geo.residence_locality} />
        <Land title={burialTitle} country={geo.burial_country} locality={geo.burial_locality} note={burialNote} />
      </dl>
    </section>
  );
};

export default MemorialOrigins;
