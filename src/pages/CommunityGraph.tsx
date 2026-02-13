import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { maskName } from "@/lib/privacyUtils";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Link } from "react-router-dom";
import { ChevronLeft, GitBranch, Users, ZoomIn, ZoomOut, Filter, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/useSEO";

interface GraphNode {
  id: string;
  label: string;
  type: "deceased" | "contributor";
  category?: string;
  memorialId?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: "direct" | "inferred" | "memorial-relation" | "living-shared";
  category: string;
  label: string;
  sharedDeceasedName?: string;
}

interface MemorialRelation {
  id: string;
  memorial_id_1: string;
  memorial_id_2: string;
  relation_type: string;
}

interface SocialInference {
  user_id: string;
  author_name: string;
  total_memorials: number;
  detail_liens: Array<{ defunt: string; lien: string; categorie: string; slug: string }> | null;
  connexions_suggerees: string[] | null;
}

const CACHE_CONFIG = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 };

/** Category color mapping */
/** Inferred link color palette — aligned with RelationshipGraph2D categories */
const inferredLinkColors: Record<string, string> = {
  famille_directe: "hsl(0, 84%, 60%)",     // Rouge
  famille_elargie: "hsl(38, 92%, 50%)",    // Ambre
  allies:          "hsl(160, 84%, 39%)",    // Émeraude
  socio_coeur:     "hsl(217, 91%, 60%)",   // Bleu
  autre:           "hsl(220, 9%, 46%)",     // Gris
};

const GOLD_COLOR = "#D4AF37";

/** Classify a category string to a palette key */
const toPaletteKey = (category: string): string => {
  const lower = category.toLowerCase();
  if (lower.includes("père") || lower.includes("mère") || lower.includes("fils") || lower.includes("fille") || lower.includes("frère") || lower.includes("sœur") || lower.includes("soeur") || lower.includes("famille directe")) return "famille_directe";
  if (lower.includes("grand") || lower.includes("oncle") || lower.includes("tante") || lower.includes("cousin") || lower.includes("neveu") || lower.includes("nièce") || lower.includes("famille élargie") || lower.includes("famille elargie")) return "famille_elargie";
  if (lower.includes("époux") || lower.includes("épouse") || lower.includes("beau") || lower.includes("belle") || lower.includes("gendre") || lower.includes("bru") || lower.includes("allié") || lower.includes("allies")) return "allies";
  if (lower.includes("ami") || lower.includes("collègue") || lower.includes("voisin") || lower.includes("camarade") || lower.includes("socio") || lower.includes("coeur")) return "socio_coeur";
  if (lower.includes("famille")) return "famille_directe";
  return "autre";
};

const getCategoryColor = (category: string): string => {
  const key = toPaletteKey(category);
  return inferredLinkColors[key] || inferredLinkColors.autre;
};

/** Classify a relation_category string into a filter group */
const classifyCategory = (category: string): string => {
  const lower = category.toLowerCase();
  if (lower.includes("famille")) return "Famille directe";
  if (lower.includes("allié") || lower.includes("allies")) return "Alliés";
  if (lower.includes("socio") || lower.includes("ami") || lower.includes("coeur")) return "Socio cœur";
  return "Autres";
};

const ALL_CATEGORIES = [
  "Famille directe",
  "Alliés",
  "Socio cœur",
  "Autres",
];

const CommunityGraph = () => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(ALL_CATEGORIES));

  const toggleFilter = (cat: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        // Don't allow deselecting all
        if (next.size <= 1) return prev;
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  useSEO({
    title: "Graphe de la Communauté — Floorence",
    description: "Visualisation du maillage social entre les proches et les défunts sur Floorence.",
  });

  // Fetch memorials
  const { data: memorials } = useQuery({
    queryKey: ["community-graph-memorials"],
    ...CACHE_CONFIG,
    queryFn: async () => {
      const { data } = await supabase
        .from("memorials")
        .select("id, first_name, last_name, slug")
        .eq("is_active", true)
        .eq("is_published", true);
      return data || [];
    },
  });

  // Fetch all public guestbook posts
  const { data: allPosts, isLoading } = useQuery({
    queryKey: ["community-graph-posts"],
    ...CACHE_CONFIG,
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_guestbook_posts");
      return data || [];
    },
  });

  // Fetch memorial relations (dead-dead links)
  const { data: memorialRelations } = useQuery({
    queryKey: ["community-graph-memorial-relations"],
    ...CACHE_CONFIG,
    queryFn: async () => {
      const { data } = await supabase
        .from("memorial_relations")
        .select("id, memorial_id_1, memorial_id_2, relation_type")
        .eq("status", "accepted");
      return (data || []) as MemorialRelation[];
    },
  });

  // Fetch social inferences (living-living shared links)
  const { data: socialInferences } = useQuery({
    queryKey: ["community-graph-social-inferences"],
    ...CACHE_CONFIG,
    queryFn: async () => {
      const { data } = await (supabase
        .from('v_social_inferences' as any)
        .select('*') as any);
      return (data || []) as SocialInference[];
    },
  });

  // Filter posts based on active category filters
  const filteredPosts = useMemo(() => {
    if (!allPosts) return [];
    return allPosts.filter((post) =>
      activeFilters.has(classifyCategory(post.relation_category))
    );
  }, [allPosts, activeFilters]);

  // Build graph data
  const graphData = useMemo(() => {
    if (!memorials || filteredPosts.length === 0) return { nodes: [], edges: [] };

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeMap = new Map<string, GraphNode>();

    const centerX = 400;
    const centerY = 300;

    // Collect memorial IDs that have posts
    const activeMemorialIds = new Set(filteredPosts.map((p) => p.memorial_id));

    // Also include memorials linked via memorial_relations
    (memorialRelations || []).forEach((rel) => {
      if (rel.memorial_id_1) activeMemorialIds.add(rel.memorial_id_1);
      if (rel.memorial_id_2) activeMemorialIds.add(rel.memorial_id_2);
    });

    // Add deceased nodes
    const activeMemorials = memorials.filter((m) => activeMemorialIds.has(m.id));
    activeMemorials.forEach((m, i) => {
      const angle = (2 * Math.PI * i) / Math.max(activeMemorials.length, 1);
      const radius = 120;
      const node: GraphNode = {
        id: `memorial-${m.id}`,
        label: `${m.first_name} ${m.last_name}`,
        type: "deceased",
        memorialId: m.id,
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        radius: 18,
      };
      nodes.push(node);
      nodeMap.set(node.id, node);
    });

    // Memorial-Memorial edges (Pont des Ancêtres)
    (memorialRelations || []).forEach((rel) => {
      const srcId = `memorial-${rel.memorial_id_1}`;
      const tgtId = `memorial-${rel.memorial_id_2}`;
      if (nodeMap.has(srcId) && nodeMap.has(tgtId)) {
        const relType = rel.relation_type;
        edges.push({
          source: srcId,
          target: tgtId,
          type: "memorial-relation",
          category: relType,
          label: relType,
        });
      }
    });

    // Group posts by user
    const userPosts = new Map<string, Array<{ memorialId: string; category: string; name: string }>>();
    filteredPosts.forEach((post) => {
      const uid = `anon-${post.author_name}`;
      if (!userPosts.has(uid)) userPosts.set(uid, []);
      userPosts.get(uid)!.push({
        memorialId: post.memorial_id,
        category: post.relation_category,
        name: post.author_name,
      });
    });

    // Add contributor nodes
    let contIdx = 0;
    userPosts.forEach((posts, uid) => {
      const angle = (2 * Math.PI * contIdx) / Math.max(userPosts.size, 1);
      const radius = 250 + (Math.random() - 0.5) * 60;
      const node: GraphNode = {
        id: `user-${uid}`,
        label: posts[0].name,
        type: "contributor",
        category: posts[0].category,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: 12,
      };
      nodes.push(node);
      nodeMap.set(node.id, node);

      // Deceased-Contributor edges
      posts.forEach((p) => {
        const memId = `memorial-${p.memorialId}`;
        if (nodeMap.has(memId)) {
          edges.push({
            source: memId,
            target: node.id,
            type: "direct",
            category: p.category,
            label: p.category,
          });
        }
      });

      contIdx++;
    });

    // Contributor-Contributor edges (same category on same memorial)
    const memorialGroups = new Map<string, Map<string, string[]>>();
    filteredPosts.forEach((post) => {
      const mid = post.memorial_id;
      const cat = post.relation_category;
      const uid = `anon-${post.author_name}`;
      if (!memorialGroups.has(mid)) memorialGroups.set(mid, new Map());
      const catMap = memorialGroups.get(mid)!;
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(uid);
    });

    const inferredEdgeSet = new Set<string>();
    memorialGroups.forEach((catMap) => {
      catMap.forEach((users, cat) => {
        for (let i = 0; i < users.length; i++) {
          for (let j = i + 1; j < users.length; j++) {
            const key = [users[i], users[j]].sort().join("|");
            if (!inferredEdgeSet.has(key)) {
              inferredEdgeSet.add(key);
              edges.push({
                source: `user-${users[i]}`,
                target: `user-${users[j]}`,
                type: "inferred",
                category: cat,
                label: "Même communauté",
              });
            }
          }
        }
      });
    });

    // Living-Living shared links from v_social_inferences
    if (socialInferences) {
      const memorialNameMap = new Map<string, string>();
      memorials.forEach(m => memorialNameMap.set(m.id, `${m.first_name} ${m.last_name}`));

      // Build a map: user_id => list of memorials with relation
      const userMemorialLinks = new Map<string, Array<{ memorialId: string; lien: string; defunt: string }>>();
      socialInferences.forEach(si => {
        if (!si.user_id || !si.detail_liens) return;
        const liens = Array.isArray(si.detail_liens) ? si.detail_liens : [];
        const memLinks: Array<{ memorialId: string; lien: string; defunt: string }> = [];
        liens.forEach((l: any) => {
          const memorial = memorials.find(m => m.slug === l.slug);
          if (memorial) {
            memLinks.push({ memorialId: memorial.id, lien: l.lien, defunt: l.defunt });
          }
        });
        if (memLinks.length > 0) {
          userMemorialLinks.set(si.user_id, memLinks);
        }
      });

      // Find pairs of users sharing the same memorial with the same link type
      const sharedLinkSet = new Set<string>();
      const userEntries = Array.from(userMemorialLinks.entries());
      for (let i = 0; i < userEntries.length; i++) {
        for (let j = i + 1; j < userEntries.length; j++) {
          const [uid1, links1] = userEntries[i];
          const [uid2, links2] = userEntries[j];
          
          links1.forEach(l1 => {
            links2.forEach(l2 => {
              if (l1.memorialId === l2.memorialId && l1.lien === l2.lien) {
                const key = [uid1, uid2].sort().join("|");
                if (!sharedLinkSet.has(key) && !inferredEdgeSet.has(key)) {
                  sharedLinkSet.add(key);
                  const srcNode = `user-${uid1}`;
                  const tgtNode = `user-${uid2}`;
                  if (nodeMap.has(srcNode) && nodeMap.has(tgtNode)) {
                    edges.push({
                      source: srcNode,
                      target: tgtNode,
                      type: "living-shared",
                      category: l1.lien,
                      label: `${l1.lien} commun`,
                      sharedDeceasedName: l1.defunt,
                    });
                  }
                }
              }
            });
          });
        }
      }
    }

    return { nodes, edges };
  }, [memorials, filteredPosts, memorialRelations, socialInferences]);

  // Force simulation
  const simulate = useCallback(() => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (nodes.length === 0) return;

    const alpha = 0.3;
    const repulsion = 2000;
    const springLength = 120;
    const springStrength = 0.02;
    const damping = 0.85;
    const centerX = 400;
    const centerY = 300;

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force * alpha;
        const fy = (dy / dist) * force * alpha;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Spring attraction (edges) — memorial-relation edges get stronger spring
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    edges.forEach((edge) => {
      const s = nodeMap.get(edge.source);
      const t = nodeMap.get(edge.target);
      if (!s || !t) return;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const targetLen = edge.type === "memorial-relation" ? 60 : springLength;
      const str = edge.type === "memorial-relation" ? springStrength * 5 : springStrength;
      const displacement = dist - targetLen;
      const force = displacement * str * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
    });

    // Stronger center gravity for deceased nodes (attract to center)
    nodes.forEach((n) => {
      if (n.type === "deceased") {
        n.vx += (centerX - n.x) * 0.008;
        n.vy += (centerY - n.y) * 0.008;
      }
    });

    // Center gravity
    nodes.forEach((n) => {
      n.vx += (centerX - n.x) * 0.001;
      n.vy += (centerY - n.y) * 0.001;
    });

    // Update positions
    nodes.forEach((n) => {
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
      // Bounds
      n.x = Math.max(30, Math.min(770, n.x));
      n.y = Math.max(30, Math.min(570, n.y));
    });
  }, []);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const dpr = window.devicePixelRatio || 1;

    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
    ctx.clearRect(0, 0, 800 / zoom, 600 / zoom);

    // Draw edges
    edges.forEach((edge) => {
      const s = nodeMap.get(edge.source);
      const t = nodeMap.get(edge.target);
      if (!s || !t) return;

      ctx.beginPath();

      if (edge.type === "memorial-relation") {
        // Golden thick line for Pont des Ancêtres — prioritaire
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.setLineDash([]);
        ctx.strokeStyle = GOLD_COLOR;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.9;
        // Golden glow effect
        ctx.shadowColor = GOLD_COLOR;
        ctx.shadowBlur = 6;
      } else if (edge.type === "living-shared") {
        // Fine dotted line — colorée par catégorie
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = getCategoryColor(edge.category);
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.65;
      } else if (edge.type === "inferred") {
        // Lien inféré — coloré par catégorie (pointillé)
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = getCategoryColor(edge.category);
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.5;
      } else {
        // Lien direct (Défunt → Vivant) — trait plein coloré
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.setLineDash([]);
        ctx.strokeStyle = getCategoryColor(edge.category);
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
      }
      ctx.stroke();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);

      // Label on memorial-relation edges (Pont des Ancêtres)
      if (edge.type === "memorial-relation") {
        const midX = (s.x + t.x) / 2;
        const midY = (s.y + t.y) / 2;
        // Background pill for label
        ctx.font = "bold 9px 'Inter', sans-serif";
        const labelText = edge.label;
        const tw = ctx.measureText(labelText).width;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.roundRect(midX - tw / 2 - 6, midY - 16, tw + 12, 16, 3);
        ctx.fill();
        ctx.strokeStyle = GOLD_COLOR;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = "#8B6914";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(labelText, midX, midY - 8);
      }
    });

    // Draw nodes
    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

      if (node.type === "deceased") {
        ctx.fillStyle = "#1F2937";
        ctx.fill();
        // Halo
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(31,41,55,0.2)";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        const color = getCategoryColor(node.category || "");
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Label
      ctx.fillStyle = node.type === "deceased" ? "#1F2937" : "#374151";
      ctx.font = node.type === "deceased" 
        ? "bold 11px 'Cormorant Garamond', serif" 
        : "10px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      
      const labelY = node.y + node.radius + 4;
      const rawLabel = isAuthenticated ? node.label : maskName(node.label);
      const shortLabel = rawLabel.length > 14
        ? rawLabel.substring(0, 14) + "…"
        : rawLabel;
      ctx.fillText(shortLabel, node.x, labelY);

      // Initial inside circle
      ctx.fillStyle = "#FFFFFF";
      ctx.font = node.type === "deceased"
        ? "bold 13px 'Cormorant Garamond', serif"
        : "10px 'Inter', sans-serif";
      ctx.textBaseline = "middle";
      ctx.fillText(
        node.label.charAt(0).toUpperCase(),
        node.x,
        node.y
      );
    });

    // Hovered node tooltip
    if (hoveredNode) {
      const edges = edgesRef.current;
      const x = hoveredNode.x + hoveredNode.radius + 10;
      const y = hoveredNode.y - 30;
      
      // Gather connected info
      const connectedEdges = edges.filter(
        e => e.source === hoveredNode.id || e.target === hoveredNode.id
      );
      const lineageLinks = connectedEdges.filter(e => e.type === "memorial-relation");
      const sharedLinks = connectedEdges.filter(e => e.type === "living-shared");
      
      const tooltipName = isAuthenticated ? hoveredNode.label : maskName(hoveredNode.label);
      const lines: string[] = [tooltipName];
      if (hoveredNode.type === "deceased") {
        lines.push("Défunt");
        if (isAuthenticated && lineageLinks.length > 0) {
          lines.push(`Lignages : ${lineageLinks.map(l => l.label).join(", ")}`);
        }
      } else {
        if (hoveredNode.category) lines.push(hoveredNode.category);
        if (isAuthenticated && sharedLinks.length > 0) {
          sharedLinks.forEach(sl => {
            lines.push(`Connecté par ${sl.category} (${sl.sharedDeceasedName ? maskName(sl.sharedDeceasedName) : ""})`);
          });
        }
        if (!isAuthenticated) {
          lines.push("Connectez-vous pour voir les détails");
        }
      }
      
      ctx.font = "10px 'Inter', sans-serif";
      const lineHeight = 14;
      const maxLineW = Math.max(...lines.map(l => ctx.measureText(l).width));
      const boxW = maxLineW + 20;
      const boxH = lines.length * lineHeight + 12;
      
      ctx.fillStyle = "rgba(255,255,255,0.97)";
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();
      
      lines.forEach((line, i) => {
        ctx.fillStyle = i === 0 ? "#1F2937" : "#6B7280";
        ctx.font = i === 0 ? "bold 11px 'Inter', sans-serif" : "10px 'Inter', sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(line, x + 10, y + 6 + i * lineHeight);
      });
    }

    // Hovered edge tooltip
    if (hoveredEdge && !hoveredNode) {
      const nodeMap2 = new Map(nodesRef.current.map(n => [n.id, n]));
      const s = nodeMap2.get(hoveredEdge.source);
      const t = nodeMap2.get(hoveredEdge.target);
      if (s && t) {
        const mx = (s.x + t.x) / 2;
        const my = (s.y + t.y) / 2;
        let title = "";
        let subtitle = "";
        const edgeColor = hoveredEdge.type === "memorial-relation"
          ? GOLD_COLOR
          : getCategoryColor(hoveredEdge.category);
        
        if (hoveredEdge.type === "living-shared") {
          title = `Liés en tant que ${hoveredEdge.category}`;
          subtitle = isAuthenticated && hoveredEdge.sharedDeceasedName
            ? `Via le mémorial de ${hoveredEdge.sharedDeceasedName}`
            : "Lien partagé";
        } else if (hoveredEdge.type === "memorial-relation") {
          title = `Pont des Ancêtres`;
          const sLabel = isAuthenticated ? s.label : maskName(s.label);
          const tLabel = isAuthenticated ? t.label : maskName(t.label);
          subtitle = `${sLabel} ↔ ${tLabel} : ${hoveredEdge.label}`;
        } else if (hoveredEdge.type === "inferred") {
          title = `Même communauté`;
          subtitle = `${hoveredEdge.category}`;
        } else {
          title = hoveredEdge.label;
        }
        
        ctx.font = "bold 10px 'Inter', sans-serif";
        const titleW = ctx.measureText(title).width;
        ctx.font = "9px 'Inter', sans-serif";
        const subtitleW = subtitle ? ctx.measureText(subtitle).width : 0;
        const maxW = Math.max(titleW, subtitleW);
        const boxW = maxW + 24;
        const boxH = subtitle ? 36 : 22;
        
        ctx.fillStyle = "rgba(255,255,255,0.97)";
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(mx - boxW / 2, my - boxH - 4, boxW, boxH, 5);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = "#1F2937";
        ctx.font = "bold 10px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(title, mx, my - boxH + 2);
        
        if (subtitle) {
          ctx.fillStyle = "#6B7280";
          ctx.font = "9px 'Inter', sans-serif";
          ctx.fillText(subtitle, mx, my - boxH + 18);
        }
      }
    }
  }, [zoom, hoveredNode, hoveredEdge]);

  // Animation loop
  useEffect(() => {
    if (graphData.nodes.length === 0) return;

    nodesRef.current = graphData.nodes.map((n) => ({ ...n }));
    edgesRef.current = [...graphData.edges];

    let iterations = 0;
    const maxIterations = 200;

    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = 800 * dpr;
      canvas.height = 600 * dpr;
    }

    const tick = () => {
      if (iterations < maxIterations) {
        simulate();
        iterations++;
      }
      draw();
      animFrameRef.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [graphData, simulate, draw]);

  // Realtime sync — auto-update when memorial_relations change
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('community-graph-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memorial_relations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["community-graph-memorial-relations"] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'guestbook_posts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["community-graph-posts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Mouse hover detection
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = 800 / rect.width;
      const scaleY = 600 / rect.height;
      const mx = (e.clientX - rect.left) * scaleX / zoom;
      const my = (e.clientY - rect.top) * scaleY / zoom;

      // Node detection
      const found = nodesRef.current.find((n) => {
        const dx = n.x - mx;
        const dy = n.y - my;
        return Math.sqrt(dx * dx + dy * dy) < n.radius + 4;
      });
      setHoveredNode(found || null);

      // Edge detection (if no node hovered)
      if (!found) {
        const nodeMap = new Map(nodesRef.current.map(n => [n.id, n]));
        const foundEdge = edgesRef.current.find((edge) => {
          const s = nodeMap.get(edge.source);
          const t = nodeMap.get(edge.target);
          if (!s || !t) return false;
          // Point-to-line distance
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const lenSq = dx * dx + dy * dy;
          if (lenSq === 0) return false;
          const param = Math.max(0, Math.min(1, ((mx - s.x) * dx + (my - s.y) * dy) / lenSq));
          const projX = s.x + param * dx;
          const projY = s.y + param * dy;
          const distSq = (mx - projX) ** 2 + (my - projY) ** 2;
          return distSq < 64; // 8px threshold
        });
        setHoveredEdge(foundEdge || null);
      } else {
        setHoveredEdge(null);
      }
    },
    [zoom]
  );

  const nodeCount = graphData.nodes.length;
  const edgeCount = graphData.edges.length;
  const useCanvas = nodeCount > 50;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-16 md:pt-20">
        <div className="container mx-auto px-4 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>
        </div>

        <section className="container mx-auto px-4 pb-16">
          <div className="mb-8">
            <h1 className="flex items-center gap-3 mb-2">
              <GitBranch className="w-8 h-8 text-foreground/70" />
              Graphe de la Communauté
            </h1>
            <p className="font-serif text-muted-foreground text-lg">
              Le maillage vivant entre les proches et les défunts
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="w-full h-[400px] rounded-sm" />
              <div className="flex gap-4">
                <Skeleton className="w-32 h-6" />
                <Skeleton className="w-32 h-6" />
              </div>
            </div>
          ) : nodeCount === 0 ? (
            <div className="bg-muted/30 border border-border rounded-sm p-16 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="font-serif mb-2">Aucune donnée communautaire</h3>
              <p className="text-sm text-muted-foreground font-sans max-w-md mx-auto">
                Le graphe se construira automatiquement à mesure que des hommages seront déposés sur les espaces mémoriels.
              </p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="flex items-center gap-6 mb-4 text-sm text-muted-foreground font-sans">
                <span>{nodeCount} nœuds</span>
                <span>{edgeCount} liaisons</span>
                <span className="text-xs italic">
                  Rendu : {useCanvas ? "Canvas (optimisé)" : "Canvas"}
                </span>
              </div>

              {/* Category Filters */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-sans mr-1">Filtrer :</span>
                {ALL_CATEGORIES.map((cat) => {
                  const isActive = activeFilters.has(cat);
                  const colorDot = getCategoryColor(cat);
                  return (
                    <Badge
                      key={cat}
                      variant={isActive ? "default" : "outline"}
                      className={`cursor-pointer text-xs font-sans transition-all select-none ${
                        isActive
                          ? "bg-foreground text-background hover:bg-foreground/80"
                          : "opacity-50 hover:opacity-80"
                      }`}
                      onClick={() => toggleFilter(cat)}
                    >
                      <span
                        className="w-2 h-2 rounded-full mr-1.5 inline-block"
                        style={{ backgroundColor: colorDot }}
                      />
                      {cat}
                    </Badge>
                  );
                })}
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                  className="h-8 px-2"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-xs text-muted-foreground font-sans w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
                  className="h-8 px-2"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>

              {/* Canvas Graph */}
              <div className="relative bg-card border border-border rounded-sm overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full"
                  style={{ maxHeight: "600px", aspectRatio: "4/3", cursor: (hoveredNode || hoveredEdge) ? "pointer" : "default" }}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => { setHoveredNode(null); setHoveredEdge(null); }}
                />
              </div>

              {/* Legend */}
              {/* Légende — Nœuds */}
              <div className="flex flex-wrap items-center gap-5 mt-6 text-xs text-muted-foreground font-sans">
                <span className="font-medium text-foreground/70">Nœuds :</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-[#1F2937]" />
                  <span>Défunt</span>
                </div>
                {Object.entries(inferredLinkColors).map(([key, color]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: color }} />
                    <span>{key === "famille_directe" ? "Famille directe" : key === "famille_elargie" ? "Famille élargie" : key === "allies" ? "Alliés" : key === "socio_coeur" ? "Socio cœur" : "Autres"}</span>
                  </div>
                ))}
              </div>
              {/* Légende — Liens */}
              <div className="flex flex-wrap items-center gap-5 mt-2 text-xs text-muted-foreground font-sans">
                <span className="font-medium text-foreground/70">Liens :</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0 border-t-2 border-foreground/60" />
                  <span>Lien direct</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0 border-t-[4px]" style={{ borderColor: GOLD_COLOR }} />
                  <span>Pont des Ancêtres</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0 border-t-[1.5px] border-dashed" style={{ borderColor: inferredLinkColors.famille_directe }} />
                  <span>Même communauté</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0 border-t-[1.5px] border-dotted" style={{ borderColor: inferredLinkColors.socio_coeur }} />
                  <span>Lien partagé</span>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CommunityGraph;
