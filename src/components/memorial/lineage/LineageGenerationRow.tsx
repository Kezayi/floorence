import { memo } from "react";
import { GENERATION_LABELS } from "./lineageConstants";
import LineageNodeCard, { type TreeNode } from "./LineageNodeCard";

type TreePosition = "root" | "trunk" | "branch";

interface LineageGenerationRowProps {
  generation: number;
  nodes: TreeNode[];
  isAuthenticated: boolean;
  currentUserId?: string;
  animDelay?: number;
  treePosition?: TreePosition;
  deceasedGender?: 'male' | 'female';
}

const LineageGenerationRow = memo(({
  generation,
  nodes,
  isAuthenticated,
  currentUserId,
  animDelay = 0,
  treePosition = "trunk",
  deceasedGender = 'male',
}: LineageGenerationRowProps) => {
  const label = GENERATION_LABELS[generation] || "Famille";

  // Determine connector color based on majority link style
  const hasAlliance = nodes.some(n => n.linkStyle === "alliance");
  const hasSibling = nodes.some(n => n.linkStyle === "sibling");
  const hasExtended = nodes.some(n => n.linkStyle === "extended");

  const lineColor = hasAlliance
    ? "bg-[#D4AF37]/60"
    : hasExtended
    ? "bg-muted-foreground/30"
    : hasSibling
    ? "bg-[#800000]/50"
    : "bg-[#800000]/80";

  // Dynamic line thickness: thicker near trunk (roots), thinner toward extremes (cime/origines)
  const absGen = Math.abs(generation);
  const lineThickness = treePosition === "root"
    ? absGen <= 1 ? "h-[3.5px]" : absGen === 2 ? "h-[2.5px]" : absGen === 3 ? "h-[2px]" : "h-[1.5px]"
    : treePosition === "branch"
    ? absGen <= 1 ? "h-[2.5px]" : absGen === 2 ? "h-[2px]" : absGen === 3 ? "h-[1.5px]" : "h-[1px]"
    : hasAlliance || hasExtended ? "h-[1.5px]" : "h-[2.5px]";

  // Opacity gradient: strongest near trunk, fading toward extremes
  const lineOpacity = absGen <= 1 ? 1 : absGen === 2 ? 0.85 : absGen === 3 ? 0.65 : 0.45;

  return (
    <div
      className="relative py-4"
      style={{
        opacity: 0,
        animation: `germinate 0.8s ease-out ${animDelay}ms both`,
      }}
    >
      {/* Horizontal connector */}
      <div
        className={`hidden md:block absolute top-1/2 left-1/4 right-1/4 ${lineThickness} ${lineColor}`}
        style={{ opacity: lineOpacity }}
      />

      {/* Generation label */}
      <div className="text-center mb-3">
        <span className="text-xs font-sans text-muted-foreground tracking-widest uppercase bg-background px-3 relative z-10">
          {label}
        </span>
      </div>

      {/* Nodes */}
      <div className="flex flex-wrap justify-center gap-6 md:gap-8">
        {nodes.map(node => (
          <LineageNodeCard
            key={node.id}
            node={node}
            isAuthenticated={isAuthenticated}
            isCurrentUser={false}
            isDeceased={true}
            deceasedGender={deceasedGender}
          />
        ))}
      </div>
    </div>
  );
});

LineageGenerationRow.displayName = "LineageGenerationRow";

export default LineageGenerationRow;
