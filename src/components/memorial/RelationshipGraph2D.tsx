import { useMemo, useState } from "react";
import { getCleanRelationName, inferAllRelationships, InferredRelationship } from "@/lib/relationshipInference";

interface RelationshipGraph2DProps {
  deceasedName: string;
  posts: Array<{
    authorId: string;
    authorName: string;
    relationCategory: string;
  }>;
}

interface GraphNode {
  id: string;
  name: string;
  category: string;
  x: number;
  y: number;
  categoryType: string;
}

// Map category to type
const getCategoryType = (category: string): string => {
  const lowerCategory = category.toLowerCase();
  
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
    lowerCategory.includes("nièce")
  ) {
    return "famille";
  }
  
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
    return "allies";
  }
  
  if (
    lowerCategory.includes("ami") ||
    lowerCategory.includes("connaissance") ||
    lowerCategory.includes("collègue") ||
    lowerCategory.includes("voisin") ||
    lowerCategory.includes("camarade") ||
    lowerCategory.includes("élève")
  ) {
    return "amis";
  }
  
  return "autre";
};

// Category colors for central dots and legend only
const categoryColors: Record<string, string> = {
  famille: "#3B82F6",   // Blue
  allies: "#22C55E",    // Green
  amis: "#EAB308",      // Yellow
  autre: "#EF4444",     // Red
};

const RelationshipGraph2D = ({ deceasedName, posts }: RelationshipGraph2DProps) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
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
    
    const authorsList = Array.from(uniqueAuthors.entries());
    
    // Calculate positions in concentric circles based on category
    const graphNodes: GraphNode[] = [];
    
    // Group by category type
    const byCategory: Record<string, Array<{ id: string; name: string; category: string }>> = {
      famille: [],
      allies: [],
      amis: [],
      autre: [],
    };
    
    authorsList.forEach(([id, data]) => {
      const type = getCategoryType(data.category);
      byCategory[type].push({ id, ...data });
    });
    
    // Arrange in concentric circles
    const categoryOrder = ["famille", "allies", "amis", "autre"];
    const baseRadius = 100;
    
    categoryOrder.forEach((catType, ringIndex) => {
      const items = byCategory[catType];
      if (items.length === 0) return;
      
      const radius = baseRadius + ringIndex * 60;
      
      items.forEach((item, idx) => {
        // Calculate starting angle offset for each ring
        const startAngle = ringIndex * (Math.PI / 6);
        const angle = startAngle + (idx / items.length) * Math.PI * 2 - Math.PI / 2;
        
        graphNodes.push({
          ...item,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          categoryType: catType,
        });
      });
    });
    
    return graphNodes;
  }, [posts]);

  // Infer relationships between living nodes
  const inferredLinks = useMemo(() => {
    const messages = posts.map(p => ({
      authorName: p.authorName,
      relationCategory: p.relationCategory,
    }));
    return inferAllRelationships(messages);
  }, [posts]);

  // Create a map of node positions by author name for drawing inter-node links
  const nodePositionsByName = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach(node => {
      map.set(node.name, { x: node.x, y: node.y });
    });
    return map;
  }, [nodes]);

  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-muted/30 rounded-sm">
        <p className="text-sm text-muted-foreground font-sans">
          Aucun hommage n'a encore été déposé.
        </p>
      </div>
    );
  }

  const viewBoxSize = 400;
  const center = viewBoxSize / 2;

  return (
    <div className="relative w-full overflow-visible">
      {/* Container responsive - s'adapte à tous les écrans */}
      <div className="w-full aspect-square max-w-full md:max-w-[450px] lg:max-w-[500px] mx-auto">
        <svg
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ minHeight: "280px" }}
        >
        {/* Background subtle grid */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.5" fill="hsl(var(--border))" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />
        
        {/* Concentric circle guides */}
        {[100, 160, 220, 280].map((radius, idx) => (
          <circle
            key={radius}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
            strokeDasharray="4 4"
            opacity={0.5 - idx * 0.1}
          />
        ))}
        
        {/* Inferred links between living nodes (dotted lines) */}
        <g className="inferred-links">
          {inferredLinks.map((link, idx) => {
            const fromPos = nodePositionsByName.get(link.fromAuthor);
            const toPos = nodePositionsByName.get(link.toAuthor);
            if (!fromPos || !toPos) return null;
            
            const opacity = link.confidence === 'high' ? 0.5 : link.confidence === 'medium' ? 0.35 : 0.2;
            
            return (
              <line
                key={`inferred-${idx}`}
                x1={center + fromPos.x}
                y1={center + fromPos.y}
                x2={center + toPos.x}
                y2={center + toPos.y}
                stroke="hsl(var(--primary))"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity={opacity}
                className="transition-all duration-300"
              />
            );
          })}
        </g>
        
        {/* Connection lines to deceased (center) - Bold black lines */}
        <g className="connection-lines">
          {nodes.map((node) => (
            <line
              key={`line-${node.id}`}
              x1={center}
              y1={center}
              x2={center + node.x}
              y2={center + node.y}
              stroke="#000000"
              strokeWidth={hoveredNode === node.id ? 3 : 2}
              opacity={hoveredNode === node.id ? 1 : 0.7}
              className="transition-all duration-300"
            />
          ))}
        </g>
        
        {/* Center node (deceased) */}
        <g className="center-node">
          <circle
            cx={center}
            cy={center}
            r="24"
            fill="hsl(var(--primary))"
            className="transition-transform duration-300"
          />
          <circle
            cx={center}
            cy={center}
            r="28"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            opacity="0.3"
          />
          <text
            x={center}
            y={center + 42}
            textAnchor="middle"
            className="font-serif text-xs fill-foreground"
            style={{ fontSize: "10px" }}
          >
            {deceasedName.split(" ")[0]}
          </text>
        </g>
        
        {/* Author nodes */}
        {nodes.map((node) => {
          const color = categoryColors[node.categoryType];
          const isHovered = hoveredNode === node.id;
          
          return (
            <g
              key={node.id}
              className="author-node cursor-pointer"
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Node circle - neutral stroke */}
              <circle
                cx={center + node.x}
                cy={center + node.y}
                r={isHovered ? 14 : 12}
                fill="hsl(var(--background))"
                stroke="hsl(var(--border))"
                strokeWidth={isHovered ? 2 : 1.5}
                className="transition-all duration-300"
              />
              
              {/* Inner dot - colored by category */}
              <circle
                cx={center + node.x}
                cy={center + node.y}
                r={isHovered ? 5 : 4}
                fill={color}
                className="transition-all duration-300"
              />
              
              {/* Name label */}
              <text
                x={center + node.x}
                y={center + node.y + 24}
                textAnchor="middle"
                className="font-serif fill-foreground pointer-events-none"
                style={{ fontSize: isHovered ? "10px" : "8px" }}
              >
                {node.name.split(" ")[0]}
              </text>
            </g>
          );
        })}
        </svg>
      </div>
      
      {/* Tooltip - responsive positioning */}
      {hoveredNode && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm border border-border shadow-lg rounded-sm px-3 py-2 animate-fade-in max-w-[85%] sm:max-w-[90%] z-10">
          {nodes.filter(n => n.id === hoveredNode).map(node => (
            <div key={node.id} className="text-center">
              <div className="font-serif text-sm text-foreground truncate">{node.name}</div>
              <div className="text-xs text-muted-foreground font-sans mt-0.5 truncate">
                {getCleanRelationName(node.category)} du défunt
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Legend with category colors - fully responsive */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mt-3 sm:mt-4 text-[10px] sm:text-xs font-sans text-muted-foreground px-1">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full" style={{ backgroundColor: categoryColors.famille }} />
          <span>Famille</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full" style={{ backgroundColor: categoryColors.allies }} />
          <span>Alliés</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full" style={{ backgroundColor: categoryColors.amis }} />
          <span>Amis</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full" style={{ backgroundColor: categoryColors.autre }} />
          <span>Autres</span>
        </div>
      </div>
    </div>
  );
};

export default RelationshipGraph2D;
