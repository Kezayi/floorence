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
  variant?: "card" | "list";
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
  variant = "card",
}: MemorialCardProps) => {
  if (variant === "list") {
    return (
      <Link
        to={`/memorial/${slug}`}
        className="memorial-card group flex flex-row items-stretch bg-card hover:shadow-lg hover:shadow-black/5 transition-all duration-500"
      >
        {/* Photo Portrait - Left */}
        <div className="w-24 md:w-32 lg:w-40 flex-shrink-0 relative overflow-hidden bg-muted">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`Portrait de ${name}`}
              className="w-full h-full object-cover portrait-memorial aspect-[3/4]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary aspect-[3/4]">
              <span className="font-serif text-3xl text-muted-foreground/30">
                {name.charAt(0)}
              </span>
            </div>
          )}
          {type === "RECENT" && (
            <div className="absolute top-2 left-2">
              <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-xs font-sans">
                Récent
              </span>
            </div>
          )}
        </div>

        {/* Info - Right */}
        <div className="flex-1 p-4 md:p-6 flex flex-col justify-center">
          <h3 className="font-serif text-lg md:text-xl lg:text-2xl leading-tight mb-1 group-hover:text-foreground/80 transition-colors">
            {name}
          </h3>
          <p className="font-sans text-sm text-muted-foreground mb-3">
            {birthDate} — {deathDate}
          </p>
          
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="text-base">🕊</span>
              <span>{ripCount}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-candle-glow" />
              <span>{candleCount}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Flower2 className="w-4 h-4 text-flower-soft" />
              <span>{flowerCount}</span>
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // Default card variant
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
