import { useState } from "react";
import { countryName, isIsoCountry } from "@/lib/geoLands";

// Bundled SVG flags (no external API); each file is only fetched when displayed.
const FLAGS = import.meta.glob("/node_modules/country-flag-icons/3x2/*.svg", {
  query: "?url", import: "default", eager: true,
}) as Record<string, string>;

const CountryFlag = ({ code, className = "", size = "sm", fallback = false }: { code: string; className?: string; size?: "sm" | "md"; fallback?: boolean }) => {
  const [broken, setBroken] = useState(false);
  if (!isIsoCountry(code)) return null;
  const src = FLAGS[`/node_modules/country-flag-icons/3x2/${code}.svg`];
  if (!src || broken) {
    return fallback ? (
      <span role="img" aria-label={`Drapeau : ${countryName(code)}`} className={`inline-flex items-center justify-center px-1 text-[10px] font-sans border border-border rounded-[2px] ${className}`}>{code}</span>
    ) : null;
  }
  const [w, h] = size === "md" ? [27, 18] : [24, 16];
  return (
    <img
      src={src}
      alt={`Drapeau : ${countryName(code)}`}
      width={w}
      height={h}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`inline-block ${size === "md" ? "w-[27px] h-[18px]" : "w-6 h-4"} object-contain border border-border rounded-[2px] ${className}`}
    />
  );
};

export default CountryFlag;
