import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { getCleanRelationName, inferAllRelationships } from "@/lib/relationshipInference";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

// Couleurs de la charte pour les liens inférés
const inferredLinkColors = {
  direct: "#000000",      // Noir - liens familiaux directs
  alliance: "#D4AF37",    // Doré - liens par alliance
  feminine: "#EC4899",    // Rose - membres féminins
  default: "#6B7280",     // Gris - autres liens
};

// Détermine la couleur du lien inféré selon la nature de la relation
const getInferredLinkColor = (link: string, confidence: string): string => {
  const lowerLink = link.toLowerCase();
  
  // Liens par alliance
  if (lowerLink.includes("alliance") || lowerLink.includes("beau") || lowerLink.includes("belle")) {
    return inferredLinkColors.alliance;
  }
  
  // Liens féminins
  if (lowerLink.includes("mère") || lowerLink.includes("sœur") || lowerLink.includes("tante") || 
      lowerLink.includes("nièce") || lowerLink.includes("cousine") || lowerLink.includes("grand-mère")) {
    return inferredLinkColors.feminine;
  }
  
  // Liens directs (haute confiance)
  if (confidence === "high" && 
      (lowerLink.includes("frère") || lowerLink.includes("père") || lowerLink.includes("fils") ||
       lowerLink.includes("parent") || lowerLink.includes("oncle") || lowerLink.includes("neveu"))) {
    return inferredLinkColors.direct;
  }
  
  return inferredLinkColors.default;
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

const RelationshipGraph2D = ({ deceasedName, posts }: RelationshipGraph2DProps) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
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
    
    // Arrange in concentric circles with dynamic radius based on node count
    const categoryOrder = ["famille", "allies", "amis", "autre"];
    const totalNodes = authorsList.length;
    
    // Adjust base radius based on total nodes
    const baseRadius = Math.max(80, Math.min(120, 60 + totalNodes * 5));
    const radiusIncrement = Math.max(50, Math.min(70, 40 + totalNodes * 3));
    
    categoryOrder.forEach((catType, ringIndex) => {
      const items = byCategory[catType];
      if (items.length === 0) return;
      
      const radius = baseRadius + ringIndex * radiusIncrement;
      
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

  // Calculate dynamic viewBox to fit all nodes
  const viewBoxParams = useMemo(() => {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, width: 400, height: 400, center: 200 };
    }
    
    // Find bounding box of all nodes
    const padding = 80; // Space for labels
    const centerPadding = 50; // Space for center node and label
    
    let minX = -centerPadding;
    let maxX = centerPadding;
    let minY = -centerPadding;
    let maxY = centerPadding;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.x - padding);
      maxX = Math.max(maxX, node.x + padding);
      minY = Math.min(minY, node.y - padding);
      maxY = Math.max(maxY, node.y + padding);
    });
    
    const width = maxX - minX;
    const height = maxY - minY;
    const size = Math.max(width, height);
    
    // Center the viewBox
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    return {
      minX: centerX - size / 2,
      minY: centerY - size / 2,
      width: size,
      height: size,
      center: 0, // Origin is now at 0,0
    };
  }, [nodes]);

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

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Mouse/Touch pan handlers
  const handlePanStart = useCallback((clientX: number, clientY: number) => {
    setIsPanning(true);
    setLastPanPoint({ x: clientX, y: clientY });
  }, []);

  const handlePanMove = useCallback((clientX: number, clientY: number) => {
    if (!isPanning) return;
    
    const deltaX = clientX - lastPanPoint.x;
    const deltaY = clientY - lastPanPoint.y;
    
    setPan(p => ({
      x: p.x + deltaX / zoom,
      y: p.y + deltaY / zoom,
    }));
    setLastPanPoint({ x: clientX, y: clientY });
  }, [isPanning, lastPanPoint, zoom]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handlePanStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handlePanMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handlePanMove]);

  // Responsive label size based on total nodes
  const labelFontSize = useMemo(() => {
    const baseSize = 11;
    if (nodes.length > 15) return baseSize - 2;
    if (nodes.length > 10) return baseSize - 1;
    return baseSize;
  }, [nodes.length]);

  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-muted/30 rounded-sm">
        <p className="text-sm text-muted-foreground font-sans">
          Aucun hommage n'a encore été déposé.
        </p>
      </div>
    );
  }

  // Apply zoom and pan to viewBox
  const zoomedWidth = viewBoxParams.width / zoom;
  const zoomedHeight = viewBoxParams.height / zoom;
  const viewBoxMinX = viewBoxParams.minX + (viewBoxParams.width - zoomedWidth) / 2 - pan.x;
  const viewBoxMinY = viewBoxParams.minY + (viewBoxParams.height - zoomedHeight) / 2 - pan.y;

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Zoom Controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-background/90 backdrop-blur-sm"
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          title="Zoom avant"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-background/90 backdrop-blur-sm"
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          title="Zoom arrière"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-background/90 backdrop-blur-sm"
          onClick={handleResetView}
          title="Réinitialiser la vue"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Zoom level indicator */}
      <div className="absolute top-2 left-2 z-10 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded font-sans">
        {Math.round(zoom * 100)}%
      </div>

      {/* Container responsive avec aspect-ratio */}
      <div 
        className="w-full aspect-square max-w-[600px] mx-auto cursor-grab active:cursor-grabbing touch-none"
        onMouseDown={(e) => handlePanStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handlePanMove(e.clientX, e.clientY)}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handlePanEnd}
      >
        <svg
          viewBox={`${viewBoxMinX} ${viewBoxMinY} ${zoomedWidth} ${zoomedHeight}`}
          className="w-full h-full select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background subtle grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="0.5" fill="hsl(var(--border))" />
            </pattern>
            {/* Drop shadow for labels */}
            <filter id="labelShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="hsl(var(--background))" floodOpacity="0.9"/>
            </filter>
          </defs>
          <rect 
            x={viewBoxParams.minX - 100} 
            y={viewBoxParams.minY - 100} 
            width={viewBoxParams.width + 200} 
            height={viewBoxParams.height + 200} 
            fill="url(#grid)" 
            opacity="0.3" 
          />
          
          {/* Concentric circle guides - positioned at origin */}
          {[80, 130, 180, 230, 280].map((radius, idx) => (
            <circle
              key={radius}
              cx={0}
              cy={0}
              r={radius}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
              strokeDasharray="4 4"
              opacity={0.4 - idx * 0.06}
            />
          ))}
          
          {/* Inferred links between living nodes (dotted lines with colors) */}
          <g className="inferred-links">
            {inferredLinks.map((link, idx) => {
              const fromPos = nodePositionsByName.get(link.fromAuthor);
              const toPos = nodePositionsByName.get(link.toAuthor);
              if (!fromPos || !toPos) return null;
              
              const isHovered = hoveredLink === idx;
              const baseOpacity = link.confidence === 'high' ? 0.6 : link.confidence === 'medium' ? 0.45 : 0.3;
              const opacity = isHovered ? 1 : baseOpacity;
              const strokeColor = getInferredLinkColor(link.inferredLink, link.confidence);
              const strokeWidth = isHovered ? 2.5 : (link.confidence === 'high' ? 1.5 : 1);
              
              // Position du milieu pour le label
              const midX = (fromPos.x + toPos.x) / 2;
              const midY = (fromPos.y + toPos.y) / 2;
              
              return (
                <g 
                  key={`inferred-${idx}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredLink(idx)}
                  onMouseLeave={() => setHoveredLink(null)}
                >
                  {/* Ligne de connexion */}
                  <line
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={link.confidence === 'high' ? "none" : "4 3"}
                    opacity={opacity}
                    className="transition-all duration-300"
                  />
                  
                  {/* Cercle au milieu pour indiquer le lien */}
                  <circle
                    cx={midX}
                    cy={midY}
                    r={isHovered ? 4 : 3}
                    fill={strokeColor}
                    opacity={opacity}
                    className="transition-all duration-300"
                  />
                  
                  {/* Label visible au survol */}
                  {isHovered && (
                    <g>
                      <rect
                        x={midX - 60}
                        y={midY - 28}
                        width="120"
                        height="20"
                        rx="3"
                        fill="hsl(var(--background))"
                        stroke={strokeColor}
                        strokeWidth="1"
                        opacity="0.95"
                      />
                      <text
                        x={midX}
                        y={midY - 14}
                        textAnchor="middle"
                        className="font-sans fill-foreground pointer-events-none"
                        style={{ fontSize: '9px', fontWeight: 500 }}
                      >
                        {link.inferredLink.length > 28 
                          ? link.inferredLink.substring(0, 25) + "..." 
                          : link.inferredLink}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
          
          {/* Connection lines to deceased (center) - Bold black lines */}
          <g className="connection-lines">
            {nodes.map((node) => (
              <line
                key={`line-${node.id}`}
                x1={0}
                y1={0}
                x2={node.x}
                y2={node.y}
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
              cx={0}
              cy={0}
              r="22"
              fill="hsl(var(--primary))"
              className="transition-transform duration-300"
            />
            <circle
              cx={0}
              cy={0}
              r="26"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1"
              opacity="0.3"
            />
            {/* Center label with background */}
            <text
              x={0}
              y={38}
              textAnchor="middle"
              className="font-serif fill-foreground"
              style={{ fontSize: `${labelFontSize + 1}px`, fontWeight: 500 }}
              filter="url(#labelShadow)"
            >
              {deceasedName.split(" ")[0]}
            </text>
          </g>
          
          {/* Author nodes */}
          {nodes.map((node) => {
            const color = categoryColors[node.categoryType];
            const isHovered = hoveredNode === node.id;
            
            // Calculate label position to avoid overlap with center
            const angle = Math.atan2(node.y, node.x);
            const labelOffset = 22;
            const labelX = node.x + Math.cos(angle) * labelOffset * 0.3;
            const labelY = node.y + labelOffset;
            
            return (
              <g
                key={node.id}
                className="author-node cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Node circle - neutral stroke */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isHovered ? 14 : 12}
                  fill="hsl(var(--background))"
                  stroke="hsl(var(--border))"
                  strokeWidth={isHovered ? 2 : 1.5}
                  className="transition-all duration-300"
                />
                
                {/* Inner dot - colored by category */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isHovered ? 5 : 4}
                  fill={color}
                  className="transition-all duration-300"
                />
                
                {/* Name label with shadow for readability */}
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  className="font-serif fill-foreground pointer-events-none"
                  style={{ 
                    fontSize: `${isHovered ? labelFontSize + 2 : labelFontSize}px`,
                    fontWeight: isHovered ? 500 : 400,
                  }}
                  filter="url(#labelShadow)"
                >
                  {node.name.split(" ")[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* Tooltip for nodes */}
      {hoveredNode && !hoveredLink && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-sm border border-border shadow-lg rounded-sm px-3 py-2 animate-fade-in max-w-[90%] z-20">
          {nodes.filter(n => n.id === hoveredNode).map(node => {
            // Trouver les liens de ce nœud avec d'autres
            const nodeLinks = inferredLinks.filter(
              l => l.fromAuthor === node.name || l.toAuthor === node.name
            );
            
            return (
              <div key={node.id} className="text-center">
                <div className="font-serif text-sm text-foreground">{node.name}</div>
                <div className="text-xs text-muted-foreground font-sans mt-0.5">
                  {getCleanRelationName(node.category)} du défunt
                </div>
                {nodeLinks.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-border/50">
                    <div className="text-[10px] text-muted-foreground mb-1">
                      Liens avec les autres proches :
                    </div>
                    {nodeLinks.slice(0, 3).map((link, i) => (
                      <div key={i} className="text-[10px] text-foreground/80">
                        {link.inferredLink}
                      </div>
                    ))}
                    {nodeLinks.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{nodeLinks.length - 3} autres liens...
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Legend with category colors and link types - responsive */}
      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-4 text-xs font-sans text-muted-foreground px-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors.famille }} />
          <span>Famille</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors.allies }} />
          <span>Alliés</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors.amis }} />
          <span>Amis</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors.autre }} />
          <span>Autres</span>
        </div>
      </div>
      
      {/* Legend for inferred link colors */}
      {inferredLinks.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-2 text-[10px] font-sans text-muted-foreground px-2">
          <span className="text-muted-foreground/70">Liens entre proches :</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5" style={{ backgroundColor: inferredLinkColors.direct }} />
            <span>Direct</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5" style={{ backgroundColor: inferredLinkColors.alliance }} />
            <span>Alliance</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5" style={{ backgroundColor: inferredLinkColors.feminine }} />
            <span>Féminin</span>
          </div>
        </div>
      )}

      {/* Touch/drag hint */}
      <p className="text-center text-xs text-muted-foreground mt-2 font-sans">
        Glissez pour déplacer • Pincez ou utilisez la molette pour zoomer
      </p>
    </div>
  );
};

export default RelationshipGraph2D;
