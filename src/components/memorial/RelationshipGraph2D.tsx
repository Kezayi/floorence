import { useMemo, useState, useRef, useCallback } from "react";
import { getCleanRelationName, inferAllRelationships } from "@/lib/relationshipInference";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelationLabel } from "@/lib/formatRelationLabel";
import { inferGender } from "@/lib/genderInference";
import { getOptimizedImageUrl } from "@/lib/imageUrl";

interface InterMemorialLink {
  name: string;
  relationType: string;
}

interface RelationshipGraph2DProps {
  deceasedName: string;
  posts: Array<{
    id?: string;
    authorId: string;
    authorName: string;
    relationCategory: string;
    relationLink?: string | null;
    authorAvatarUrl?: string | null;
  }>;
  interMemorialLinks?: InterMemorialLink[];
}

interface GraphNode {
  id: string;
  name: string;
  category: string;
  relationLabel: string;
  x: number;
  y: number;
  categoryType: string;
}

// Map category to one of 5 social categories
const getCategoryType = (category: string): string => {
  const lc = category.toLowerCase();

  // Famille directe : parents, enfants, fratrie
  if (
    lc.includes("père") || lc.includes("mère") ||
    lc.includes("fils") || lc.includes("fille") ||
    lc.includes("frère") || lc.includes("sœur") || lc.includes("soeur")
  ) {
    return "famille_directe";
  }

  // Famille élargie : grands-parents, petits-enfants, oncles, tantes, cousins, neveux
  if (
    lc.includes("grand") || lc.includes("petit") ||
    lc.includes("oncle") || lc.includes("tante") ||
    lc.includes("cousin") || lc.includes("neveu") || lc.includes("nièce")
  ) {
    return "famille_elargie";
  }

  // Alliés : époux, beau-famille, gendre, bru
  if (
    lc.includes("époux") || lc.includes("épouse") ||
    lc.includes("mari") || lc.includes("femme") ||
    lc.includes("beau") || lc.includes("belle") ||
    lc.includes("gendre") || lc.includes("bru")
  ) {
    return "allies";
  }

  // Socio cœur : amis, collègues, voisins, camarades
  if (
    lc.includes("ami") || lc.includes("connaissance") ||
    lc.includes("collègue") || lc.includes("voisin") ||
    lc.includes("camarade") || lc.includes("élève")
  ) {
    return "socio_coeur";
  }

  return "autre";
};

// Palette 5 catégories sociales
const categoryStyles: Record<string, { fill: string; label: string }> = {
  famille_directe: { fill: "hsl(0, 84%, 60%)",    label: "Famille directe" },   // Rouge
  famille_elargie: { fill: "hsl(38, 92%, 50%)",   label: "Famille élargie" },   // Ambre
  allies:          { fill: "hsl(160, 84%, 39%)",   label: "Alliés" },            // Émeraude
  socio_coeur:     { fill: "hsl(217, 91%, 60%)",   label: "Socio cœur" },       // Bleu
  autre:           { fill: "hsl(220, 9%, 46%)",    label: "Autres" },            // Gris
};

// Couleur du lien inféré basée sur la catégorie sémantique
const getInferredLinkColor = (link: string): string => {
  const categoryType = getCategoryType(link);
  return categoryStyles[categoryType]?.fill ?? categoryStyles.autre.fill;
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

const GOLD_COLOR = "#D4AF37";
const ENERGY_COLOR = "#8B5CF6"; // Violet énergétique

// Extraire le(s) nom(s) de famille d'un nom complet
const extractLastNames = (fullName: string): string[] => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return parts.map(p => p.toLowerCase());
  // Tout sauf le premier mot (prénom) constitue le(s) nom(s) de famille
  return parts.slice(1).map(p => p.toLowerCase());
};

// Vérifie si deux personnes partagent au moins un nom de famille
const shareLastName = (nameA: string, nameB: string): string | null => {
  const lastNamesA = extractLastNames(nameA);
  const lastNamesB = extractLastNames(nameB);
  for (const lnA of lastNamesA) {
    for (const lnB of lastNamesB) {
      if (lnA === lnB && lnA.length > 1) return lnA.charAt(0).toUpperCase() + lnA.slice(1);
    }
  }
  return null;
};

interface EnergyLink {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  reason: "category" | "clan" | "both";
  categoryLabel?: string;
  clanName?: string;
}

const RelationshipGraph2D = ({ deceasedName, posts, interMemorialLinks }: RelationshipGraph2DProps) => {
  const deceasedGender = useMemo(() => inferGender(deceasedName.split(' ')[0]), [deceasedName]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEnergyLink, setHoveredEnergyLink] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // RIBENGA-01: one key per author — UUID if known, else the stable post id
  // (or list index). A shared name never merges two contributors.
  const authorKeyOf = (post: any, index: number): string =>
    post.authorId && post.authorId.length > 0
      ? post.authorId
      : `anon::${post.id ?? index}`;

  // Portraits par nœud (même clé que les nœuds) — rendu uniquement, topologie inchangée
  const avatarById = useMemo(() => {
    const map = new Map<string, string>();
    posts.forEach((post, index) => {
      const key = authorKeyOf(post, index);
      if (!map.has(key) && post.authorAvatarUrl && !post.authorAvatarUrl.startsWith("data:")) {
        const url = getOptimizedImageUrl(post.authorAvatarUrl, { width: 48, height: 48 });
        if (url) map.set(key, url);
      }
    });
    return map;
  }, [posts]);

  const nodes = useMemo(() => {
    // ═══ DEDUP by UUID only — anonymous authors stay distinct ═══
    const uniqueAuthors = new Map<string, { name: string; category: string; relationLink: string | null }>();

    posts.forEach((post, index) => {
      const dedupKey = authorKeyOf(post, index);
      if (!uniqueAuthors.has(dedupKey)) {
        const effectiveCategory = post.relationLink || post.relationCategory;
        uniqueAuthors.set(dedupKey, { name: post.authorName, category: effectiveCategory, relationLink: post.relationLink || null });
      }
    });
    
    const authorsList = Array.from(uniqueAuthors.entries());
    const graphNodes: GraphNode[] = [];
    
    const byCategory: Record<string, Array<{ id: string; name: string; category: string; relationLink: string | null }>> = {
      famille_directe: [], famille_elargie: [], allies: [], socio_coeur: [], autre: [],
    };
    
    authorsList.forEach(([id, data]) => {
      const type = getCategoryType(data.category);
      byCategory[type].push({ id, ...data });
    });
    
    const categoryOrder = ["famille_directe", "famille_elargie", "allies", "socio_coeur", "autre"];
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
        const label = item.relationLink
          ? formatRelationLabel(item.relationLink, deceasedGender)
          : getCleanRelationName(item.category);
        graphNodes.push({
          ...item,
          relationLabel: label,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          categoryType: catType,
        });
      });
    });
    
    return graphNodes;
  }, [posts, deceasedGender, interMemorialLinks]);

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

  // Compute energy links: connect living nodes by shared category or clan (last name)
  const energyLinks = useMemo((): EnergyLink[] => {
    const links: EnergyLink[] = [];
    const seen = new Set<string>();
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const pairKey = [a.id, b.id].sort().join("|");
        if (seen.has(pairKey)) continue;
        
        const sameCategory = a.categoryType === b.categoryType;
        const clanName = shareLastName(a.name, b.name);
        
        if (sameCategory || clanName) {
          seen.add(pairKey);
          links.push({
            fromId: a.id,
            toId: b.id,
            fromName: a.name,
            toName: b.name,
            reason: sameCategory && clanName ? "both" : clanName ? "clan" : "category",
            categoryLabel: sameCategory ? (categoryStyles[a.categoryType]?.label || a.categoryType) : undefined,
            clanName: clanName || undefined,
          });
        }
      }
    }
    return links;
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

  if (posts.length === 0 && (!interMemorialLinks || interMemorialLinks.length === 0)) {
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

      {/* Canvas SVG — GPU-accelerated for smooth pan/zoom on entry-level devices */}
      <div 
        className="w-full aspect-square max-w-[600px] mx-auto cursor-grab active:cursor-grabbing touch-none gpu-accelerated"
        style={{ contain: 'layout style paint' }}
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
            {/* Animation de flux d'énergie — GPU-accelerated via will-change */}
            <style>{`
              @keyframes energyFlow {
                0% { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: -24; }
              }
              .energy-line {
                animation: energyFlow 3s linear infinite;
                will-change: stroke-dashoffset;
                transform: translateZ(0);
              }
            `}</style>
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
          
          {/* Liaisons d'énergie entre vivants (catégorie / clan) */}
          <g className="energy-links" style={{ pointerEvents: 'auto' }}>
            {energyLinks.map((link, idx) => {
              const fromNode = nodes.find(n => n.id === link.fromId);
              const toNode = nodes.find(n => n.id === link.toId);
              if (!fromNode || !toNode) return null;
              
              const isHovered = hoveredEnergyLink === idx;
              
              // Courbe de Bézier — point de contrôle tiré vers le centre
              const midX = (fromNode.x + toNode.x) / 2;
              const midY = (fromNode.y + toNode.y) / 2;
              const ctrlX = midX * 0.7;
              const ctrlY = midY * 0.7;
              
              // Tooltip text
              let tooltipText = `Lien de mémoire partagé au sein de la ${link.categoryLabel || "communauté"}`;
              if (link.clanName) {
                tooltipText = link.reason === "both"
                  ? `${tooltipText} · Clan ${link.clanName}`
                  : `Lien du clan ${link.clanName}`;
              }
              
              return (
                <g
                  key={`energy-${idx}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredEnergyLink(idx)}
                  onMouseLeave={() => setHoveredEnergyLink(null)}
                >
                  {/* Ligne invisible épaisse pour le hover */}
                  <path
                    d={`M ${fromNode.x} ${fromNode.y} Q ${ctrlX} ${ctrlY} ${toNode.x} ${toNode.y}`}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={12}
                  />
                  {/* Ligne énergétique violet pointillée animée */}
                  <path
                    d={`M ${fromNode.x} ${fromNode.y} Q ${ctrlX} ${ctrlY} ${toNode.x} ${toNode.y}`}
                    fill="none"
                    stroke={ENERGY_COLOR}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    strokeDasharray="6 6"
                    opacity={isHovered ? 0.6 : 0.25}
                    className="energy-line transition-opacity duration-300"
                  />
                  
                  {/* Tooltip au survol */}
                  {isHovered && (
                    <g>
                      <rect
                        x={midX - 75} y={midY - 28}
                        width="150" height="20"
                        rx="3"
                        fill="hsl(0, 0%, 98%)"
                        stroke={ENERGY_COLOR}
                        strokeWidth="0.5"
                        opacity="0.95"
                      />
                      <text
                        x={midX} y={midY - 15}
                        textAnchor="middle"
                        className="font-sans pointer-events-none"
                        style={{ fontSize: '7px', fontWeight: 400, fill: ENERGY_COLOR }}
                      >
                        {tooltipText.length > 45 ? tooltipText.substring(0, 42) + "…" : tooltipText}
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

          {/* Nœuds défunts liés — Pont des Ancêtres (ligne dorée) */}
          {(interMemorialLinks || []).map((link, idx) => {
            const count = interMemorialLinks?.length || 1;
            const startAngle = -Math.PI * 0.75;
            const angleSpread = Math.PI * 1.5;
            const angle = count === 1
              ? -Math.PI / 4
              : startAngle + (idx / count) * angleSpread;
            const r = 75;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;

            return (
              <g key={`inter-memorial-${idx}`}>
                {/* Ligne dorée épaisse */}
                <line
                  x1={0} y1={0} x2={x} y2={y}
                  stroke={GOLD_COLOR}
                  strokeWidth={3}
                  opacity={0.85}
                  className="transition-all duration-500"
                />
                {/* Halo doré */}
                <circle cx={x} cy={y} r={22} fill="none" stroke={GOLD_COLOR} strokeWidth="0.5" opacity="0.25" />
                {/* Cercle noir avec bordure dorée */}
                <circle cx={x} cy={y} r={16} fill="hsl(0, 0%, 8%)" />
                <circle cx={x} cy={y} r={16} fill="none" stroke={GOLD_COLOR} strokeWidth={1.5} opacity={0.8} />
                {/* Initiale dorée */}
                <text
                  x={x} y={y + 4} textAnchor="middle"
                  className="font-serif pointer-events-none"
                  style={{ fontSize: '11px', fontWeight: 500, fill: GOLD_COLOR }}
                >
                  {link.name.charAt(0).toUpperCase()}
                </text>
                {/* Nom sous le nœud */}
                <text
                  x={x} y={y + 32} textAnchor="middle"
                  className="font-serif"
                  style={{ fontSize: `${labelFontSize}px`, fontWeight: 500, fill: GOLD_COLOR }}
                  filter="url(#textGlow)"
                >
                  {link.name.split(" ")[0]}
                </text>
                {/* Label de relation */}
                <text
                  x={x} y={y + 44} textAnchor="middle"
                  className="font-sans"
                  style={{ fontSize: '7px', fontWeight: 400, fill: 'hsl(0, 0%, 50%)', letterSpacing: '0.08em', textTransform: 'uppercase' } as React.CSSProperties}
                  filter="url(#textGlow)"
                >
                  {link.relationType}
                </text>
              </g>
            );
          })}
          
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
                
                {/* Médaillon photo (adaptation SVG du composant souverain <Photo>) ou point coloré en repli */}
                {avatarById.get(node.id) ? (
                  <>
                    <clipPath id={`node-clip-${node.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`}>
                      <circle cx={node.x} cy={node.y} r={isHovered ? 12 : 10} />
                    </clipPath>
                    <image
                      href={avatarById.get(node.id)}
                      x={node.x - (isHovered ? 12 : 10)}
                      y={node.y - (isHovered ? 12 : 10)}
                      width={isHovered ? 24 : 20}
                      height={isHovered ? 24 : 20}
                      preserveAspectRatio="xMidYMid meet"
                      clipPath={`url(#node-clip-${node.id.replace(/[^a-zA-Z0-9_-]/g, "_")})`}
                      className="pointer-events-none"
                      aria-label={node.name}
                    />
                  </>
                ) : (
                  <circle
                    cx={node.x} cy={node.y}
                    r={isHovered ? 5 : 3.5}
                    fill={style.fill}
                    className="transition-all duration-300"
                  />
                )}
                
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
                {/* Relation label */}
                <text
                  x={labelX} y={labelY + labelFontSize + 2}
                  textAnchor="middle"
                  className="font-sans pointer-events-none"
                  style={{
                    fontSize: '7px',
                    fontWeight: 400,
                    fill: style.fill,
                    letterSpacing: '0.03em',
                  }}
                  filter="url(#textGlow)"
                >
                  {node.relationLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* Tooltip au survol d'un nœud */}
      {hoveredNode && hoveredEnergyLink === null && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border shadow-md rounded-sm px-4 py-3 animate-fade-in max-w-[85%] z-20">
          {nodes.filter(n => n.id === hoveredNode).map(node => {
            const nodeEnergyLinks = energyLinks.filter(
              l => l.fromId === node.id || l.toId === node.id
            );
            return (
              <div key={node.id} className="text-center">
                <div className="font-serif text-sm text-foreground">{node.name}</div>
                <div className="text-xs font-sans mt-0.5" style={{ color: categoryStyles[node.categoryType]?.fill }}>
                  {node.relationLabel}
                </div>
                {nodeEnergyLinks.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="text-[10px] text-muted-foreground mb-1 font-sans uppercase tracking-wider">
                      Liens d'énergie
                    </div>
                    {nodeEnergyLinks.slice(0, 3).map((link, i) => {
                      const otherName = link.fromId === node.id ? link.toName : link.fromName;
                      const label = link.clanName ? `Clan ${link.clanName}` : link.categoryLabel || "";
                      return (
                        <div key={i} className="text-[11px] font-serif" style={{ color: ENERGY_COLOR }}>
                          {otherName.split(" ")[0]} · {label}
                        </div>
                      );
                    })}
                    {nodeEnergyLinks.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">
                        +{nodeEnergyLinks.length - 3} autres…
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
        {interMemorialLinks && interMemorialLinks.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: GOLD_COLOR }} />
            <span className="tracking-wide" style={{ color: GOLD_COLOR }}>Pont des Ancêtres</span>
          </div>
        )}
      </div>
      
      {/* Légende des liens énergétiques */}
      {energyLinks.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 mt-2 text-[10px] font-sans text-muted-foreground/70 px-2">
          <div className="flex items-center gap-1">
            <div className="w-5 h-0 border-t-[1.5px] border-dashed" style={{ borderColor: ENERGY_COLOR, opacity: 0.5 }} />
            <span style={{ color: ENERGY_COLOR }}>Flux d'énergie entre proches</span>
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
