import { BURIAL_STATUS_LABELS, COUNTRY_OPTIONS, type BurialStatus, type GeoLands } from "@/lib/geoLands";

interface Props {
  value: GeoLands;
  onChange: (next: GeoLands) => void;
  inputClassName?: string;
}

const NONE = "";

const GeoLandsFields = ({ value, onChange, inputClassName = "w-full p-3 bg-secondary border-0 font-sans text-sm focus:outline-none focus:ring-1 focus:ring-ring" }: Props) => {
  const set = (k: keyof GeoLands, v: string) => onChange({ ...value, [k]: v === NONE ? null : v });

  const CountrySelect = ({ k, id, label }: { k: keyof GeoLands; id: string; label: string }) => (
    <div>
      <label htmlFor={id} className="block text-xs font-sans text-muted-foreground mb-1">{label}</label>
      <select id={id} value={(value[k] as string) ?? NONE} onChange={(e) => set(k, e.target.value)} className={inputClassName}>
        <option value={NONE}>Non renseigné</option>
        {COUNTRY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
      </select>
    </div>
  );

  const Locality = ({ k, id, label }: { k: keyof GeoLands; id: string; label: string }) => (
    <div>
      <label htmlFor={id} className="block text-xs font-sans text-muted-foreground mb-1">{label}</label>
      <input id={id} type="text" maxLength={120} value={(value[k] as string) ?? ""}
        onChange={(e) => onChange({ ...value, [k]: e.target.value || null })}
        placeholder="Facultatif" className={inputClassName} />
    </div>
  );

  return (
    <fieldset className="space-y-5">
      <legend className="text-sm font-sans text-muted-foreground mb-1">Origines et dernier repos <span className="text-xs">(facultatif)</span></legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <p className="sm:col-span-2 font-serif text-base">Terre originelle</p>
        {CountrySelect({ k: "origin_country", id: "geo-origin-country", label: "Pays d'origine familiale" })}
        {Locality({ k: "origin_locality", id: "geo-origin-locality", label: "Ville ou localité" })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <p className="sm:col-span-2 font-serif text-base">Terre de vie</p>
        {CountrySelect({ k: "residence_country", id: "geo-res-country", label: "Dernier pays de résidence" })}
        {Locality({ k: "residence_locality", id: "geo-res-locality", label: "Ville ou localité" })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <p className="sm:col-span-2 font-serif text-base">Terre finale</p>
        {CountrySelect({ k: "burial_country", id: "geo-burial-country", label: "Pays d'inhumation" })}
        {Locality({ k: "burial_locality", id: "geo-burial-locality", label: "Ville ou localité" })}
        <div className="sm:col-span-2">
          <label htmlFor="geo-burial-status" className="block text-xs font-sans text-muted-foreground mb-1">Statut de l'inhumation</label>
          <select id="geo-burial-status" value={value.burial_status ?? NONE}
            onChange={(e) => onChange({ ...value, burial_status: (e.target.value || null) as BurialStatus | null })}
            className={inputClassName}>
            <option value={NONE}>Non renseigné</option>
            {(Object.keys(BURIAL_STATUS_LABELS) as BurialStatus[]).map((s) => <option key={s} value={s}>{BURIAL_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>
    </fieldset>
  );
};

export default GeoLandsFields;
