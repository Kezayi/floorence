import { useMemo, useState, useRef, useCallback } from "react";
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
    lowerCategory.includes("fils") || lowerCategory.includes("fille") ||
    lowerCategory.includes("père") || lowerCategory.includes("mère") ||
    lowerCategory.includes("frère") || lowerCategory.includes("sœur") ||
    lowerCategory.includes("soeur") || lowerCategory.includes("grand") ||
    lowerCategory.includes("petit") || lowerCategory.includes("oncle") ||
    lowerCategory.includes("tante") || lowerCategory.includes("cousin") ||
    lowerCategory.includes("neveu") || lowerCategory.includes("nièce")
  ) {
    return "famille";
  }
  
  if (
    lowerCategory.includes("époux") || lowerCategory.includes("épouse") ||
    lowerCategory.includes("mari") || lowerCategory.includes("femme") ||
    lowerCategory.includes("beau") || lowerCategory.includes("belle") ||
    lowerCategory.includes("gendre") || lowerCategory.includes("bru")
  ) {
    return "allies";
  }
  
  if (
    lowerCategory.includes("ami") || lowerCategory.includes("connaissance") ||
    lowerCategory.includes("collègue") || lowerCategory.includes("voisin") ||
    lowerCategory.includes("camarade") || lowerCategory.includes("élève")
  ) {
    return "amis";
  }
  
  return "autre";
};

// Palette Floorence : Noir (Direct), Doré (Alliance), Rose (Féminin), Gris (Autre)
const categoryStyles: Record<string, { fill: string; label: string }> = {
  famille: { fill: "hsl(0, 0%, 15%)", label: "Famille" },
  allies: { fill: "hsl(45, 90%, 50%)", label: "Alliés" },
  amis: { fill: "hsl(340, 60%, 65%)", label: "Amis" },
  autre: { fill: "hsl(0, 0%, 55%)", label: "Autres" },
};

// Couleur du lien inféré basée sur la catégorie sémantique
const getInferredLinkColor = (link: string): string => {
  const categoryType = getCategoryType(link);
  return categoryStyles[categoryType]?.fill ?? categoryStyles.autre.fill;
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
  
  const nodes = useMemo(() => {
    const uniqueAuthors = new Map<string, { name: string; category: string }>();
    posts.forEach((post) => {
      if (!uniqueAuthors.has(post.authorId)) {
        uniqueAuthors.set(post.authorId, { name: post.authorName, category: post.relationCategory });
      }
    });
    
    const authorsList = Array.from(uniqueAuthors.entries());
    const graphNodes: GraphNode[] = [];
    
    const byCategory: Record<string, Array<{ id: string; name: string; category: string }>> = {
      famille: [], allies: [], amis: [], autre: [],
    };
    
    authorsList.forEach(([id, data]) => {
      const type = getCategoryType(data.category);
      byCategory[type].push({ id, ...data });
    });
    
    const categoryOrder = ["famille", "allies", "amis", "autre"];
    const totalNodes = authorsList.length;
    const baseRadius = Math.max(90, Math.min(130, 70 + totalNodes * 5));
    const radiusIncrement = Math.max(55, Math.min(75, 45 + totalNodes * 3));
    
    categoryOrder.forEach((catType, ringIndex) => {
      const items = byCategory[catType];
      if (items.length === 0) return;
      const radius = baseRadius + ringIndex * radiusIncrement;
      
      items.forEach((item, idx) => {
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

  const viewBoxParams = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, minY: 0, width: 400, height: 400 };
    const padding = 90;
    const centerPadding = 60;
    let minX = -centerPadding, maxX = centerPadding, minY = -centerPadding, maxY = centerPadding;
    nodes.forEach(node => {
      minX = Math.min(minX, node.x - padding);
      maxX = Math.max(maxX, node.x + padding);
      minY = Math.min(minY, node.y - padding);
      maxY = Math.max(maxY, node.y + padding);
    });
    const width = maxX - minX;
    const height = maxY - minY;
    const size = Math.max(width, height);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    return { minX: centerX - size / 2, minY: centerY - size / 2, width: size, height: size };
  }, [nodes]);

  const inferredLinks = useMemo(() => {
    const messages = posts.map(p => ({ authorName: p.authorName, relationCategory: p.relationCategory }));
    return inferAllRelationships(messages);
  }, [posts]);

  const nodePositionsByName = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach(node => map.set(node.name, { x: node.x, y: node.y }));
    return map;
  }, [nodes]);

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP)), []);
  const handleResetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const handlePanStart = useCallback((clientX: number, clientY: number) => {
    setIsPanning(true);
    setLastPanPoint({ x: clientX, y: clientY });
  }, []);

  const handlePanMove = useCallback((clientX: number, clientY: number) => {
    if (!isPanning) return;
    const deltaX = clientX - lastPanPoint.x;
    const deltaY = clientY - lastPanPoint.y;
    setPan(p => ({ x: p.x + deltaX / zoom, y: p.y + deltaY / zoom }));
    setLastPanPoint({ x: clientX, y: clientY });
  }, [isPanning, lastPanPoint, zoom]);

  const handlePanEnd = useCallback(() => setIsPanning(false), []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
  }, [handlePanStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) handlePanMove(e.touches[0].clientX, e.touches[0].clientY);
  }, [handlePanMove]);

  const labelFontSize = useMemo(() => {
    if (nodes.length > 15) return 9;
    if (nodes.length > 10) return 10;
    return 11;
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

  const zoomedWidth = viewBoxParams.width / zoom;
  const zoomedHeight = viewBoxParams.height / zoom;
  const viewBoxMinX = viewBoxParams.minX + (viewBoxParams.width - zoomedWidth) / 2 - pan.x;
  const viewBoxMinY = viewBoxParams.minY + (viewBoxParams.height - zoomedHeight) / 2 - pan.y;

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Contrôles de zoom */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <Button variant="outline" size="icon" className="h-7 w-7 bg-card/90 backdrop-blur-sm border-border/50" onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7 bg-card/90 backdrop-blur-sm border-border/50" onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7 bg-card/90 backdrop-blur-sm border-border/50" onClick={handleResetView}>
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Indicateur de zoom */}
      <div className="absolute top-3 left-3 z-10 text-[10px] text-muted-foreground bg-card/80 backdrop-blur-sm px-2 py-1 rounded-sm font-sans tracking-wider">
        {Math.round(zoom * 100)}%
      </div>

      {/* Canvas SVG */}
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
          <defs>
            {/* Halo central */}
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(0, 0%, 8%)" stopOpacity="0.15" />
              <stop offset="70%" stopColor="hsl(0, 0%, 8%)" stopOpacity="0.04" />
              <stop offset="100%" stopColor="hsl(0, 0%, 8%)" stopOpacity="0" />
            </radialGradient>
            {/* Ombre douce pour lisibilité des labels */}
            <filter id="textGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feFlood floodColor="hsl(0, 0%, 98%)" floodOpacity="0.85" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Gradient doré pour alliance */}
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(45, 90%, 55%)" />
              <stop offset="100%" stopColor="hsl(45, 70%, 42%)" />
            </linearGradient>
          </defs>
          
          {/* Cercles concentriques élégants */}
          {[90, 145, 200, 260].map((radius, idx) => (
            <circle
              key={radius}
              cx={0} cy={0} r={radius}
              fill="none"
              stroke="hsl(0, 0%, 85%)"
              strokeWidth="0.5"
              strokeDasharray={idx === 0 ? "none" : "2 6"}
              opacity={0.35 - idx * 0.05}
            />
          ))}

          {/* Halo central subtil */}
          <circle cx={0} cy={0} r={65} fill="url(#centerGlow)" />
          
          {/* Liens inférés entre vivants */}
          <g className="inferred-links">
            {inferredLinks.map((link, idx) => {
              const fromPos = nodePositionsByName.get(link.fromAuthor);
              const toPos = nodePositionsByName.get(link.toAuthor);
              if (!fromPos || !toPos) return null;
              
              const isHovered = hoveredLink === idx;
              const baseOpacity = link.confidence === 'high' ? 0.7 : link.confidence === 'medium' ? 0.55 : 0.4;
              const opacity = isHovered ? 1 : baseOpacity;
              const strokeColor = getInferredLinkColor(link.inferredLink);
              const strokeWidth = isHovered ? 2.5 : (link.confidence === 'high' ? 1.8 : 1.3);
              
              // Courbe de Bézier au lieu de ligne droite pour plus d'élégance
              const midX = (fromPos.x + toPos.x) / 2;
              const midY = (fromPos.y + toPos.y) / 2;
              // Déplacer le point de contrôle vers le centre pour une courbe subtile
              const ctrlX = midX * 0.85;
              const ctrlY = midY * 0.85;
              
              return (
                <g 
                  key={`inferred-${idx}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredLink(idx)}
                  onMouseLeave={() => setHoveredLink(null)}
                >
                  <path
                    d={`M ${fromPos.x} ${fromPos.y} Q ${ctrlX} ${ctrlY} ${toPos.x} ${toPos.y}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray="4 3"
                    opacity={opacity}
                    className="transition-all duration-500"
                  />
                  
                  {/* Point de connexion au milieu de la courbe */}
                  <circle
                    cx={ctrlX + (midX - ctrlX) * 0.5}
                    cy={ctrlY + (midY - ctrlY) * 0.5}
                    r={isHovered ? 4.5 : 3}
                    fill={strokeColor}
                    opacity={opacity}
                    className="transition-all duration-300"
                  />
                  
                  {/* Label au survol */}
                  {isHovered && (
                    <g>
                      <rect
                        x={midX - 55} y={midY - 26}
                        width="110" height="18"
                        rx="2"
                        fill="hsl(0, 0%, 98%)"
                        stroke={strokeColor}
                        strokeWidth="0.5"
                        opacity="0.95"
                      />
                      <text
                        x={midX} y={midY - 14}
                        textAnchor="middle"
                        className="font-serif pointer-events-none"
                        style={{ fontSize: '8px', fontWeight: 400, fill: 'hsl(0, 0%, 15%)' }}
                      >
                        {link.inferredLink.length > 25 
                          ? link.inferredLink.substring(0, 22) + "…" 
                          : link.inferredLink}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
          
          {/* Lignes de connexion vers le défunt (centre) */}
          <g className="connection-lines">
            {nodes.map((node) => {
              const style = categoryStyles[node.categoryType];
              const isActive = hoveredNode === node.id;
              return (
                <line
                  key={`line-${node.id}`}
                  x1={0} y1={0}
                  x2={node.x} y2={node.y}
                  stroke={style.fill}
                  strokeWidth={isActive ? 1.8 : 1}
                  opacity={isActive ? 0.7 : 0.25}
                  className="transition-all duration-500"
                />
              );
            })}
          </g>
          
          {/* Nœud central (défunt) */}
          <g className="center-node">
            {/* Double cercle élégant */}
            <circle cx={0} cy={0} r="28" fill="none" stroke="hsl(0, 0%, 15%)" strokeWidth="0.5" opacity="0.2" />
            <circle cx={0} cy={0} r="20" fill="hsl(0, 0%, 8%)" />
            <circle cx={0} cy={0} r="20" fill="none" stroke="hsl(0, 0%, 98%)" strokeWidth="0.5" opacity="0.3" />
            {/* Initiale du défunt */}
            <text
              x={0} y={5}
              textAnchor="middle"
              className="font-serif pointer-events-none"
              style={{ fontSize: '14px', fontWeight: 500, fill: 'hsl(0, 0%, 95%)' }}
            >
              {deceasedName.charAt(0).toUpperCase()}
            </text>
            {/* Nom sous le cercle */}
            <text
              x={0} y={42}
              textAnchor="middle"
              className="font-serif"
              style={{ fontSize: `${labelFontSize + 2}px`, fontWeight: 500, fill: 'hsl(0, 0%, 15%)' }}
              filter="url(#textGlow)"
            >
              {deceasedName.split(" ")[0]}
            </text>
            <text
              x={0} y={54}
              textAnchor="middle"
              className="font-sans"
              style={{ fontSize: '7px', fontWeight: 400, fill: 'hsl(0, 0%, 50%)', letterSpacing: '0.1em', textTransform: 'uppercase' } as React.CSSProperties}
              filter="url(#textGlow)"
            >
              défunt
            </text>
          </g>
          
          {/* Nœuds des auteurs */}
          {nodes.map((node) => {
            const style = categoryStyles[node.categoryType];
            const isHovered = hoveredNode === node.id;
            
            const angle = Math.atan2(node.y, node.x);
            const labelOffset = 24;
            const labelX = node.x + Math.cos(angle) * labelOffset * 0.3;
            const labelY = node.y + labelOffset;
            
            return (
              <g
                key={node.id}
                className="author-node cursor-pointer"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Halo au survol */}
                {isHovered && (
                  <circle
                    cx={node.x} cy={node.y} r="18"
                    fill="none"
                    stroke={style.fill}
                    strokeWidth="0.5"
                    opacity="0.3"
                    className="animate-[pulse-soft_2s_ease-in-out_infinite]"
                  />
                )}
                
                {/* Cercle extérieur */}
                <circle
                  cx={node.x} cy={node.y}
                  r={isHovered ? 13 : 11}
                  fill="hsl(0, 0%, 98%)"
                  stroke={style.fill}
                  strokeWidth={isHovered ? 1.5 : 0.8}
                  className="transition-all duration-300"
                />
                
                {/* Point intérieur coloré */}
                <circle
                  cx={node.x} cy={node.y}
                  r={isHovered ? 5 : 3.5}
                  fill={style.fill}
                  className="transition-all duration-300"
                />
                
                {/* Nom */}
                <text
                  x={labelX} y={labelY}
                  textAnchor="middle"
                  className="font-serif pointer-events-none"
                  style={{ 
                    fontSize: `${isHovered ? labelFontSize + 1 : labelFontSize}px`,
                    fontWeight: isHovered ? 500 : 400,
                    fill: 'hsl(0, 0%, 20%)',
                  }}
                  filter="url(#textGlow)"
                >
                  {node.name.split(" ")[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* Tooltip au survol d'un nœud */}
      {hoveredNode && !hoveredLink && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border shadow-md rounded-sm px-4 py-3 animate-fade-in max-w-[85%] z-20">
          {nodes.filter(n => n.id === hoveredNode).map(node => {
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
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="text-[10px] text-muted-foreground mb-1 font-sans uppercase tracking-wider">
                      Liens entre proches
                    </div>
                    {nodeLinks.slice(0, 3).map((link, i) => (
                      <div key={i} className="text-[11px] text-foreground/80 font-serif">
                        {link.inferredLink}
                      </div>
                    ))}
                    {nodeLinks.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{nodeLinks.length - 3} autres…
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Légende — Palette Floorence */}
      <div className="flex flex-wrap justify-center gap-4 mt-5 text-[11px] font-sans text-muted-foreground px-2">
        {Object.entries(categoryStyles).map(([key, style]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: style.fill }} />
            <span className="tracking-wide">{style.label}</span>
          </div>
        ))}
      </div>
      
      {/* Légende des liens inférés */}
      {inferredLinks.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 mt-2 text-[10px] font-sans text-muted-foreground/70 px-2">
          <span className="italic">Liens entre proches :</span>
          <div className="flex items-center gap-1">
            <div className="w-5 h-[1.5px] border-t border-dashed" style={{ borderColor: categoryStyles.famille.fill }} />
            <span>Famille</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-[1.5px] border-t border-dashed" style={{ borderColor: categoryStyles.allies.fill }} />
            <span>Alliés</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-[1.5px] border-t border-dashed" style={{ borderColor: categoryStyles.amis.fill }} />
            <span>Amis</span>
          </div>
        </div>
      )}

      {/* Aide navigation */}
      <p className="text-center text-[10px] text-muted-foreground/50 mt-3 font-sans italic">
        Glissez pour déplacer · Pincez ou molette pour zoomer
      </p>
    </div>
  );
};

export default RelationshipGraph2D;
