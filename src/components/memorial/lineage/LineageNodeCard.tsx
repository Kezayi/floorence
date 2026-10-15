import { memo, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { displayName } from "@/lib/privacyUtils";
import { formatRelationLabel } from "@/lib/formatRelationLabel";
import Photo from "@/components/ui/Photo";
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
  deceasedGender?: 'male' | 'female';
}

const LineageNodeCard = memo(({ node, isAuthenticated, isCurrentUser, isDeceased = true, deceasedGender = 'male' }: LineageNodeCardProps) => {

  // Lazy loading: only render photo when card enters viewport (saves RAM on entry-level phones)
  const { ref: inViewRef, inView } = useInView({
    triggerOnce: true,
    rootMargin: "200px 0px", // Start loading 200px before visible
  });

  const content = (
    <div
      ref={inViewRef}
      className={`flex flex-col items-center group transition-all duration-300 relative gpu-accelerated ${
        isCurrentUser ? "ring-2 ring-ai-gold/50 rounded-lg p-2 bg-ai-gold/5 shadow-[0_0_16px_hsl(var(--ai-gold)/0.25)]" : ""
      }`}
    >
      {/* Portrait — minimal, no colored backgrounds */}
      <div
        className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden transition-all duration-600 border ${
          isCurrentUser
            ? "border-ai-gold shadow-[0_0_12px_hsl(var(--ai-gold)/0.3)]"
            : node.linkStyle === "alliance"
            ? "border-lineage-alliance"
            : node.linkStyle === "blood" || node.linkStyle === "sibling"
            ? "border-lineage-direct"
            : "border-lineage-extended"
        } bg-transparent ${isDeceased ? "grayscale hover:grayscale-0" : ""}`}
      >
        <Photo
          src={inView ? node.photo : null}
          alt={displayName(node.name, isAuthenticated)}
          variant="node"
          fallbackName={node.name}
          targetWidth={80}
          targetHeight={80}
        />
      </div>

      {/* Deceased indicator — subtle candle, increased stroke for low-lum screens */}
      {isDeceased && (
        <Flame className="absolute -top-1 -right-1 w-3.5 h-3.5 text-lineage-alliance" strokeWidth={2.5} />
      )}

      {/* Name */}
      <span className="mt-2 font-serif text-xs md:text-sm text-lineage-direct text-center max-w-[100px] truncate">
        {displayName(node.name, isAuthenticated)}
      </span>

      {/* Relation label — italic, no background */}
      <span className="text-[10px] md:text-xs text-lineage-alliance font-sans italic text-center">
        {formatRelationLabel(node.relation, deceasedGender)}
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
});

LineageNodeCard.displayName = "LineageNodeCard";

export default LineageNodeCard;
