import { COUNTRY_OPTIONS, countryName } from "@/lib/geoLands";

// GEO-02 — Pays de résidence déclaré. Gabon est seulement proposé : il n'est retenu qu'après un clic explicite.
interface Props {
  id: string;
  label: string;
  value: string | null;
  onChange: (code: string | null) => void;
  suggestGabon?: boolean;
  className?: string;
}

const ResidenceCountrySelect = ({ id, label, value, onChange, suggestGabon = true, className = "w-full p-3 bg-secondary border-0 font-sans focus:outline-none focus:ring-1 focus:ring-ring" }: Props) => (
  <div>
    <label htmlFor={id} className="block text-sm font-sans text-muted-foreground mb-1">{label}</label>
    <select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className={className}>
      <option value="">Non renseigné</option>
      {COUNTRY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
    </select>
    {suggestGabon && !value && (
      <button type="button" onClick={() => onChange("GA")}
        className="mt-1 text-xs font-sans text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm">
        Je réside au {countryName("GA")} — confirmer
      </button>
    )}
  </div>
);

export default ResidenceCountrySelect;
