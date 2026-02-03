import { useState, useEffect, useRef, useMemo } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { getRelationWithDeceased } from "@/lib/relationshipInference";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RelationshipNode {
  id: string;
  name: string;
  category: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface RelationshipGraphProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deceasedName: string;
  posts: Array<{
    authorId: string;
    authorName: string;
    relationCategory: string;
  }>;
}

// Map category to color
const getCategoryColor = (category: string): string => {
  const lowerCategory = category.toLowerCase();
  
  // Famille - Bleu
  if (
    lowerCategory.includes("fils") ||
    lowerCategory.includes("fille") ||
    lowerCategory.includes("père") ||
    lowerCategory.includes("mère") ||
    lowerCategory.includes("frère") ||
    lowerCategory.includes("sœur") ||
    lowerCategory.includes("soeur") ||
    lowerCategory.includes("grand") ||
    lowerCategory.includes("petit") ||
    lowerCategory.includes("oncle") ||
    lowerCategory.includes("tante") ||
    lowerCategory.includes("cousin") ||
    lowerCategory.includes("neveu") ||
    lowerCategory.includes("nièce") ||
    lowerCategory.includes("niece")
  ) {
    return "#3B82F6"; // Blue
  }
  
  // Alliés - Vert
  if (
    lowerCategory.includes("époux") ||
    lowerCategory.includes("épouse") ||
    lowerCategory.includes("mari") ||
    lowerCategory.includes("femme") ||
    lowerCategory.includes("beau") ||
    lowerCategory.includes("belle") ||
    lowerCategory.includes("gendre") ||
    lowerCategory.includes("bru")
  ) {
    return "#22C55E"; // Green
  }
  
  // Amis/Connaissances - Jaune
  if (
    lowerCategory.includes("ami") ||
    lowerCategory.includes("connaissance") ||
    lowerCategory.includes("collègue") ||
    lowerCategory.includes("collegue") ||
    lowerCategory.includes("voisin") ||
    lowerCategory.includes("camarade") ||
    lowerCategory.includes("élève") ||
    lowerCategory.includes("eleve")
  ) {
    return "#EAB308"; // Yellow
  }
  
  // Autre - Rouge
  return "#EF4444"; // Red
};

const getCategoryLabel = (color: string): string => {
  switch (color) {
    case "#3B82F6":
      return "Famille";
    case "#22C55E":
      return "Alliés";
    case "#EAB308":
      return "Amis/Connaissances";
    case "#EF4444":
      return "Autre";
    default:
      return "Autre";
  }
};

// Bounce easing function
const bounceOut = (t: number): number => {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

// Elastic easing for more spring-like effect
const elasticOut = (t: number): number => {
  const p = 0.3;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
};

const RelationshipGraph = ({
  open,
  onOpenChange,
  deceasedName,
  posts,
}: RelationshipGraphProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [scale, setScale] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationStartTime = useRef<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<RelationshipNode | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Reset animation when dialog opens
  useEffect(() => {
    if (open) {
      setAnimationProgress(0);
      animationStartTime.current = null;
      setHoveredNode(null);
    }
  }, [open]);

  // Create unique nodes from posts
  const nodes = useMemo(() => {
    const uniqueAuthors = new Map<string, { name: string; category: string }>();
    
    posts.forEach((post) => {
      if (!uniqueAuthors.has(post.authorId)) {
        uniqueAuthors.set(post.authorId, {
          name: post.authorName,
          category: post.relationCategory,
        });
      }
    });

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.3;

    const authorNodes: RelationshipNode[] = [];
    let index = 0;
    const totalNodes = uniqueAuthors.size;

    uniqueAuthors.forEach((value, key) => {
      const angle = (2 * Math.PI * index) / totalNodes - Math.PI / 2;
      authorNodes.push({
        id: key,
        name: value.name,
        category: value.category,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
      });
      index++;
    });

    return authorNodes;
  }, [posts, dimensions]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      const isMobile = window.innerWidth < 640;
      setDimensions({
        width: isMobile ? window.innerWidth - 48 : 600,
        height: isMobile ? 350 : 450,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Animated draw function
  useEffect(() => {
    if (!open || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const totalAnimationDuration = 1500; // 1.5 seconds total
    const centerNodeDuration = 400; // Center node appears first
    const staggerDelay = 150; // Delay between each node

    const animate = (timestamp: number) => {
      if (animationStartTime.current === null) {
        animationStartTime.current = timestamp;
      }

      const elapsed = timestamp - animationStartTime.current;
      const progress = Math.min(elapsed / totalAnimationDuration, 1);
      setAnimationProgress(progress);

      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      ctx.save();
      
      // Apply scale
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);

      // Calculate center node animation (appears first with bounce)
      const centerProgress = Math.min(elapsed / centerNodeDuration, 1);
      const centerScale = bounceOut(centerProgress);

      // Draw connections with progressive reveal
      nodes.forEach((node, index) => {
        const nodeDelay = centerNodeDuration + index * staggerDelay;
        const nodeElapsed = Math.max(0, elapsed - nodeDelay);
        const nodeProgress = Math.min(nodeElapsed / 400, 1);
        
        if (nodeProgress > 0) {
          const lineProgress = Math.min(nodeElapsed / 200, 1);
          
          // Animated line from center to node position
          const currentX = centerX + (node.x - centerX) * lineProgress;
          const currentY = centerY + (node.y - centerY) * lineProgress;
          
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(currentX, currentY);
          ctx.strokeStyle = getCategoryColor(node.category);
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.6 * lineProgress;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });

      // Draw center node (deceased) with bounce animation
      if (centerScale > 0) {
        const actualCenterRadius = 30 * centerScale;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, actualCenterRadius, 0, 2 * Math.PI);
        ctx.fillStyle = "#000000";
        ctx.fill();
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw deceased name with fade in
        ctx.globalAlpha = centerProgress;
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${10 * centerScale}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        const nameParts = deceasedName.split(" ");
        if (nameParts.length > 1 && deceasedName.length > 12) {
          ctx.fillText(nameParts[0], centerX, centerY - 5 * centerScale);
          ctx.fillText(nameParts.slice(1).join(" ").substring(0, 10), centerX, centerY + 7 * centerScale);
        } else {
          ctx.fillText(deceasedName.substring(0, 12), centerX, centerY);
        }
        ctx.globalAlpha = 1;
      }

      // Draw author nodes with staggered bounce animation
      nodes.forEach((node, index) => {
        const nodeDelay = centerNodeDuration + index * staggerDelay;
        const nodeElapsed = Math.max(0, elapsed - nodeDelay);
        const nodeProgress = Math.min(nodeElapsed / 400, 1);
        
        if (nodeProgress > 0) {
          const nodeScale = elasticOut(nodeProgress);
          const color = getCategoryColor(node.category);
          const actualNodeRadius = 20 * nodeScale;
          
          // Node circle with bounce
          ctx.beginPath();
          ctx.arc(node.x, node.y, actualNodeRadius, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.globalAlpha = nodeProgress;
          ctx.fill();
          ctx.strokeStyle = "#FFFFFF";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.globalAlpha = 1;

          // Node label with fade in
          if (nodeProgress > 0.5) {
            const labelOpacity = (nodeProgress - 0.5) * 2;
            ctx.globalAlpha = labelOpacity;
            ctx.fillStyle = "#1F2937";
            ctx.font = "11px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            
            const firstName = node.name.split(" ")[0];
            ctx.fillText(firstName, node.x, node.y + 25);
            ctx.globalAlpha = 1;
          }
        }
      });

      ctx.restore();

      // Continue animation if not complete
      const totalDuration = centerNodeDuration + nodes.length * staggerDelay + 400;
      if (elapsed < totalDuration) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [open, nodes, scale, dimensions, deceasedName]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 2));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const handleReset = () => setScale(1);

  // Handle mouse move for hover detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    
    // Check if hovering over center node (deceased)
    const centerDist = Math.sqrt(
      Math.pow((mouseX - centerX) / scale, 2) + 
      Math.pow((mouseY - centerY) / scale, 2)
    );
    
    if (centerDist <= 30) {
      setHoveredNode({
        id: "deceased",
        name: deceasedName,
        category: "Défunt",
        x: centerX,
        y: centerY,
        vx: 0,
        vy: 0,
      });
      setTooltipPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      return;
    }
    
    // Check if hovering over any author node
    for (const node of nodes) {
      const adjustedNodeX = centerX + (node.x - centerX) * scale;
      const adjustedNodeY = centerY + (node.y - centerY) * scale;
      const dist = Math.sqrt(
        Math.pow(mouseX - adjustedNodeX, 2) + 
        Math.pow(mouseY - adjustedNodeY, 2)
      );
      
      if (dist <= 20 * scale) {
        setHoveredNode(node);
        setTooltipPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        return;
      }
    }
    
    setHoveredNode(null);
  };

  const handleMouseLeave = () => {
    setHoveredNode(null);
  };

  // Legend items
  const legendItems = [
    { color: "#000000", label: "Défunt" },
    { color: "#3B82F6", label: "Famille" },
    { color: "#22C55E", label: "Alliés" },
    { color: "#EAB308", label: "Amis/Connaissances" },
    { color: "#EF4444", label: "Autre" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            Maillage relationnel
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                className="h-8 w-8"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                className="h-8 w-8"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleReset}
                className="h-8 w-8"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">
              {nodes.length} hommage{nodes.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Canvas */}
          <div className="relative bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
            {nodes.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <p>Aucun hommage n'a encore été déposé.</p>
                <p className="text-sm mt-1">
                  Le graphe se construira au fur et à mesure des publications.
                </p>
              </div>
            ) : (
              <>
                <canvas
                  ref={canvasRef}
                  width={dimensions.width}
                  height={dimensions.height}
                  className="cursor-pointer"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                />
                
                {/* Tooltip */}
                {hoveredNode && (
                  <div
                    className="absolute pointer-events-none z-10 bg-background border border-border shadow-lg rounded-md px-3 py-2 text-sm"
                    style={{
                      left: Math.min(tooltipPosition.x + 10, dimensions.width - 150),
                      top: Math.max(tooltipPosition.y - 60, 10),
                    }}
                  >
                    <div className="font-serif font-medium text-foreground">
                      {hoveredNode.name}
                    </div>
                    <div className="text-muted-foreground text-xs flex items-center gap-1.5 mt-0.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ 
                          backgroundColor: hoveredNode.category === "Défunt" 
                            ? "#000000" 
                            : getCategoryColor(hoveredNode.category) 
                        }}
                      />
                      {getRelationWithDeceased(hoveredNode.category)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RelationshipGraph;
