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

  // All connectors use the unified light gray
  const lineColor = "bg-lineage-connector";

  // Uniform thin connector — "archive familiale" aesthetic
  const absGen = Math.abs(generation);
  const lineThickness = "h-[1px]";
  const lineOpacity = absGen <= 1 ? 0.8 : absGen === 2 ? 0.6 : 0.4;

  return (
    <div
      className="relative py-4 lineage-gpu-layer"
      style={{
        opacity: 0,
        animation: `germinate 0.8s ease-out ${animDelay}ms both`,
        contain: 'layout style paint',
      }}
    >
      {/* Horizontal connector — visible on all screens */}
      <div
        className={`absolute top-1/2 left-[10%] right-[10%] md:left-1/4 md:right-1/4 ${lineThickness} ${lineColor}`}
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
