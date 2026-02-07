import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Link } from "react-router-dom";
import { ChevronLeft, GitBranch, Users, ZoomIn, ZoomOut, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/useSEO";

interface GraphNode {
  id: string;
  label: string;
  type: "deceased" | "contributor";
  category?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: "direct" | "inferred";
  category: string;
  label: string;
}

const CACHE_CONFIG = { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 };

/** Category color mapping */
const getCategoryColor = (category: string): string => {
  const lower = category.toLowerCase();
  if (lower.includes("famille directe") || lower.includes("famille élargie") || lower.includes("famille")) return "#1F2937";
  if (lower.includes("allié") || lower.includes("allies")) return "hsl(45, 90%, 50%)";
  if (lower.includes("socio") || lower.includes("ami") || lower.includes("coeur")) return "hsl(340, 60%, 65%)";
  return "#9CA3AF";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
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

    // Add deceased nodes (only memorials with visible posts)
    const activeMemorials = memorials.filter((m) => activeMemorialIds.has(m.id));
    activeMemorials.forEach((m, i) => {
      const angle = (2 * Math.PI * i) / Math.max(activeMemorials.length, 1);
      const radius = 120;
      const node: GraphNode = {
        id: `memorial-${m.id}`,
        label: `${m.first_name} ${m.last_name}`,
        type: "deceased",
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        radius: 18,
      };
      nodes.push(node);
      nodeMap.set(node.id, node);
    });

    // Group posts by user
    const userPosts = new Map<string, Array<{ memorialId: string; category: string; name: string }>>();
    filteredPosts.forEach((post) => {
      const uid = post.user_id || `anon-${post.author_name}`;
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
      const uid = post.user_id || `anon-${post.author_name}`;
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

    return { nodes, edges };
  }, [memorials, filteredPosts]);

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

    // Spring attraction (edges)
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    edges.forEach((edge) => {
      const s = nodeMap.get(edge.source);
      const t = nodeMap.get(edge.target);
      if (!s || !t) return;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const displacement = dist - springLength;
      const force = displacement * springStrength * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      s.vx += fx;
      s.vy += fy;
      t.vx -= fx;
      t.vy -= fy;
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
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);

      if (edge.type === "inferred") {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(156,163,175,0.4)";
        ctx.lineWidth = 1;
      } else {
        ctx.setLineDash([]);
        ctx.strokeStyle = getCategoryColor(edge.category);
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
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
      const shortLabel = node.label.length > 14
        ? node.label.substring(0, 14) + "…"
        : node.label;
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

    // Hovered node info
    if (hoveredNode) {
      const x = hoveredNode.x + hoveredNode.radius + 8;
      const y = hoveredNode.y - 10;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.lineWidth = 1;
      const text = hoveredNode.label;
      const metrics = ctx.measureText(text);
      const boxW = metrics.width + 16;
      ctx.beginPath();
      ctx.roundRect(x, y, boxW, 24, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1F2937";
      ctx.font = "11px 'Inter', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x + 8, y + 12);
    }
  }, [zoom, hoveredNode]);

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

      const found = nodesRef.current.find((n) => {
        const dx = n.x - mx;
        const dy = n.y - my;
        return Math.sqrt(dx * dx + dy * dy) < n.radius + 4;
      });

      setHoveredNode(found || null);
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
                  style={{ maxHeight: "600px", aspectRatio: "4/3", cursor: hoveredNode ? "pointer" : "default" }}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoveredNode(null)}
                />
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-5 mt-6 text-xs text-muted-foreground font-sans">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-[#1F2937]" />
                  <span>Défunt</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#1F2937" }} />
                  <span>Famille</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "hsl(45, 90%, 50%)" }} />
                  <span>Alliés</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "hsl(340, 60%, 65%)" }} />
                  <span>Socio cœur</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-[#9CA3AF]" />
                  <span>Autres</span>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <div className="w-6 h-0 border-t-2 border-foreground/60" />
                  <span>Lien direct</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0 border-t-2 border-dashed border-muted-foreground/60" />
                  <span>Même communauté</span>
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
