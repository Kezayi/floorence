import { useState, useEffect, useRef, useMemo } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
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

  // Draw the graph
  useEffect(() => {
    if (!open || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    const draw = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);
      ctx.save();
      
      // Apply scale
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);

      // Draw connections
      nodes.forEach((node) => {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(node.x, node.y);
        ctx.strokeStyle = getCategoryColor(node.category);
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // Draw center node (deceased)
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
      ctx.fillStyle = "#000000";
      ctx.fill();
      ctx.strokeStyle = "#333333";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw deceased name
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Split name if too long
      const nameParts = deceasedName.split(" ");
      if (nameParts.length > 1 && deceasedName.length > 12) {
        ctx.fillText(nameParts[0], centerX, centerY - 5);
        ctx.fillText(nameParts.slice(1).join(" ").substring(0, 10), centerX, centerY + 7);
      } else {
        ctx.fillText(deceasedName.substring(0, 12), centerX, centerY);
      }

      // Draw author nodes
      nodes.forEach((node) => {
        const color = getCategoryColor(node.category);
        
        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Node label
        ctx.fillStyle = "#1F2937";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        
        const firstName = node.name.split(" ")[0];
        ctx.fillText(firstName, node.x, node.y + 25);
      });

      ctx.restore();
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [open, nodes, scale, dimensions, deceasedName]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 2));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const handleReset = () => setScale(1);

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
              <canvas
                ref={canvasRef}
                width={dimensions.width}
                height={dimensions.height}
                className="cursor-move"
              />
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
