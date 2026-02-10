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
}

const LineageGenerationRow = ({
  generation,
  nodes,
  isAuthenticated,
  currentUserId,
  animDelay = 0,
  treePosition = "trunk",
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

  // Line thickness: thicker at roots (bottom), thinner at branches (top)
  const lineHeight = treePosition === "root"
    ? "h-[3px]"
    : treePosition === "branch"
    ? "h-[1.5px]"
    : hasAlliance || hasExtended ? "h-[1.5px]" : "h-[2.5px]";

  return (
    <div
      className="relative py-4 animate-fade-in"
      style={{ animationDelay: `${animDelay}ms`, animationFillMode: "both" }}
    >
      {/* Horizontal connector */}
      <div
        className={`hidden md:block absolute top-1/2 left-1/4 right-1/4 ${lineHeight} ${lineColor}`}
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
          />
        ))}
      </div>
    </div>
  );
};

export default LineageGenerationRow;
