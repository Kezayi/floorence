import { countryName, isIsoCountry } from "@/lib/geoLands";

// Bundled SVG flags (no external API); each file is only fetched when displayed.
const FLAGS = import.meta.glob("/node_modules/country-flag-icons/3x2/*.svg", {
  query: "?url", import: "default", eager: true,
}) as Record<string, string>;

const CountryFlag = ({ code, className = "" }: { code: string; className?: string }) => {
  if (!isIsoCountry(code)) return null;
  const src = FLAGS[`/node_modules/country-flag-icons/3x2/${code}.svg`];
  if (!src) return null;
  return (
    <img
      src={src}
      alt={`Drapeau : ${countryName(code)}`}
      width={24}
      height={16}
      loading="lazy"
      className={`inline-block w-6 h-4 object-contain border border-border rounded-[2px] ${className}`}
    />
  );
};

export default CountryFlag;
