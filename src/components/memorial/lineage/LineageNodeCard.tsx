import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { displayName } from "@/lib/privacyUtils";
import type { LinkStyle } from "./lineageConstants";

export interface TreeNode {
  id: string;
  name: string;
  firstName: string;
  photo: string | null;
  shareToken: string | null;
  relation: string;
  generation: number;
  linkStyle: LinkStyle;
  createdBy?: string;
}

interface LineageNodeCardProps {
  node: TreeNode;
  isAuthenticated: boolean;
  isCurrentUser: boolean;
  isDeceased?: boolean;
}

const LineageNodeCard = ({ node, isAuthenticated, isCurrentUser, isDeceased = true }: LineageNodeCardProps) => {
  const initials = node.name.split(" ").map(n => n[0]).join("").slice(0, 2);

  const content = (
    <div
      className={`flex flex-col items-center group transition-all duration-300 relative ${
        isCurrentUser ? "ring-2 ring-ai-gold/50 rounded-lg p-2 bg-ai-gold/5 shadow-[0_0_16px_hsl(var(--ai-gold)/0.25)]" : ""
      }`}
    >
      {/* Portrait — grayscale for deceased, color for living */}
      <div
        className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden transition-all duration-600 border-2 ${
          isCurrentUser
            ? "border-ai-gold bg-ai-gold/20 shadow-[0_0_12px_hsl(var(--ai-gold)/0.3)]"
            : node.linkStyle === "alliance"
            ? "border-[#D4AF37]/60 bg-muted"
            : node.linkStyle === "blood" || node.linkStyle === "sibling"
            ? "border-[#800000]/60 bg-muted"
            : "border-border bg-muted"
        } ${isDeceased ? "grayscale hover:grayscale-0" : ""}`}
      >
        {node.photo ? (
          <img
            src={node.photo}
            alt={displayName(node.name, isAuthenticated)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-serif text-lg text-muted-foreground">
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Deceased indicator — subtle candle */}
      {isDeceased && (
        <Flame className="absolute -top-1 -right-1 w-3.5 h-3.5 text-[hsl(var(--gesture-candle))]/60" />
      )}

      {/* Name */}
      <span className="mt-2 font-serif text-xs md:text-sm text-foreground text-center max-w-[100px] truncate">
        {displayName(node.name, isAuthenticated)}
      </span>

      {/* Relation label */}
      <span className="text-[10px] md:text-xs text-muted-foreground font-sans text-center">
        {node.relation}
      </span>
    </div>
  );

  if (node.shareToken) {
    return (
      <Link
        to={`/m/${node.shareToken}`}
        className="hover:opacity-80 transition-opacity"
        title={`Voir l'espace mémoriel de ${displayName(node.name, isAuthenticated)}`}
      >
        {content}
      </Link>
    );
  }

  return content;
};

export default LineageNodeCard;
