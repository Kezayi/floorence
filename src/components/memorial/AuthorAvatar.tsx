import { memo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getRelationCategory } from "@/lib/relationCategoryUtils";

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
      {avatarUrl ? (
        <AvatarImage
          src={avatarUrl}
          alt={authorName}
          className="object-cover grayscale-[30%]"
          width={size === "sm" ? 32 : 40}
          height={size === "sm" ? 32 : 40}
        />
      ) : null}
      <AvatarFallback
        className={`bg-memorial-dark-muted/30 text-memorial-dark-muted ${textSize} font-sans`}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
});

AuthorAvatar.displayName = "AuthorAvatar";

export default AuthorAvatar;
