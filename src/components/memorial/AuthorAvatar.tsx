import Photo from "@/components/ui/Photo";
import { memo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { getRelationCategory } from "@/lib/relationCategoryUtils";

/** Palette sobre pour les initiales d'avatar (gris, bordeaux, or) */
const FALLBACK_PALETTES = [
  "bg-[hsl(0_0%_30%)] text-[hsl(0_0%_85%)]",         // gris anthracite
  "bg-[hsl(0_70%_20%)] text-[hsl(0_0%_90%)]",         // bordeaux foncé
  "bg-[hsl(43_56%_28%)] text-[hsl(43_56%_85%)]",      // or sombre
  "bg-[hsl(0_0%_40%)] text-[hsl(0_0%_90%)]",          // gris moyen
  "bg-[hsl(0_40%_30%)] text-[hsl(0_0%_88%)]",         // brun-rouge
];

function getFallbackColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return FALLBACK_PALETTES[Math.abs(hash) % FALLBACK_PALETTES.length];
}

interface AuthorAvatarProps {
  avatarUrl: string | null | undefined;
  authorName: string;
  relationCategory: string;
  size?: "sm" | "md";
}

/**
 * "Sceau d'Auteur" — circular avatar displayed next to tributes.
 * Shows a bordeaux border for "Famille directe" members (Trait de Sang).
 * Fixed dimensions to prevent CLS.
 */
const AuthorAvatar = memo(({ avatarUrl, authorName, relationCategory, size = "sm" }: AuthorAvatarProps) => {
  const initials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const category = getRelationCategory(relationCategory);
  const isFamilleDirecte = category === "Famille directe";

  const sizeClass = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <Avatar
      className={`${sizeClass} shrink-0 ${
        isFamilleDirecte
          ? "ring-2 ring-[#800000] ring-offset-1 ring-offset-memorial-dark"
          : ""
      }`}
    >
      <Photo
        src={avatarUrl}
        alt={`Portrait de ${authorName}`}
        fallbackName={authorName}
        variant="node"
        targetWidth={size === "sm" ? 32 : 40}
        imgClassName="grayscale-[30%]"
      />
    </Avatar>
  );
});

AuthorAvatar.displayName = "AuthorAvatar";

export default AuthorAvatar;
