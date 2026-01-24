import { Link } from "react-router-dom";
import { Flame, Flower2 } from "lucide-react";

interface MemorialCardProps {
  id: string;
  slug: string;
  name: string;
  birthDate: string;
  deathDate: string;
  photoUrl?: string;
  ripCount: number;
  candleCount: number;
  flowerCount: number;
  type: "RECENT" | "PAST";
}

const MemorialCard = ({
  slug,
  name,
  birthDate,
  deathDate,
  photoUrl,
  ripCount,
  candleCount,
  flowerCount,
  type,
}: MemorialCardProps) => {
  return (
    <Link
      to={`/memorial/${slug}`}
      className="memorial-card group block"
    >
      {/* Photo Portrait */}
      <div className="aspect-[3/4] relative overflow-hidden bg-muted">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`Portrait de ${name}`}
            className="w-full h-full object-cover portrait-memorial"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <span className="font-serif text-6xl text-muted-foreground/30">
              {name.charAt(0)}
            </span>
          </div>
        )}

        {/* Type Badge */}
        {type === "RECENT" && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-sans">
              Récent
            </span>
          </div>
        )}

        {/* Overlay Info on Hover */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="flex items-center gap-3 text-white text-sm">
            <span className="flex items-center gap-1">
              <span className="text-xs">🕊</span>
              {ripCount}
            </span>
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-candle-glow" />
              {candleCount}
            </span>
            <span className="flex items-center gap-1">
              <Flower2 className="w-3 h-3 text-flower-soft" />
              {flowerCount}
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-serif text-lg md:text-xl leading-tight mb-1 group-hover:text-foreground/80 transition-colors">
          {name}
        </h3>
        <p className="font-sans text-sm text-muted-foreground">
          {birthDate} — {deathDate}
        </p>
      </div>
    </Link>
  );
};

export default MemorialCard;
