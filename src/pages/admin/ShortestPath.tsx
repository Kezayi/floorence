import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Route, Search, Users, ArrowRight, Crown, TreePine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { analyzeKinship, formatDegree, type KinshipAnalysis } from "@/lib/kinshipCalculator";

/* ── Types ── */
interface MemorialOption {
  id: string;
  name: string;
  shareToken: string | null;
  photo: string | null;
}

interface GraphEdge {
  from: string;
  to: string;
  relationType: string;
}

interface PathNode {
  id: string;
  name: string;
  photo: string | null;
  shareToken: string | null;
}

interface PathStep {
  node: PathNode;
  relation: string; // relation label from prev to this
  isBlood: boolean;
}

/* ── Relation classification ── */
const BLOOD_KEYWORDS = [
  "père", "mère", "parent", "fils", "fille", "enfant",
  "frère", "sœur", "soeur", "demi-frère", "demi-sœur",
  "grand-père", "grand-mère", "petit-fils", "petite-fille",
  "oncle", "tante", "neveu", "nièce", "cousin", "cousine",
  "arrière-grand", "arrière-petit",
];

const ALLIANCE_KEYWORDS = [
  "époux", "épouse", "mari", "femme", "conjoint", "conjointe",
  "beau-père", "belle-mère", "beau-fils", "belle-fille",
  "beau-frère", "belle-sœur", "belle-soeur",
];

const isBloodRelation = (rel: string): boolean => {
  const lower = rel.toLowerCase();
  return BLOOD_KEYWORDS.some(k => lower.includes(k));
};

const isAllianceRelation = (rel: string): boolean => {
  const lower = rel.toLowerCase();
  return ALLIANCE_KEYWORDS.some(k => lower.includes(k));
};

/* ── BFS shortest path (max 5 degrees) ── */
const MAX_DEGREES = 5;

const bfs = (
  graph: Map<string, { to: string; rel: string }[]>,
  startId: string,
  endId: string,
  bloodOnly: boolean
): string[][] | null => {
  if (startId === endId) return [[startId]];

  const visited = new Set<string>();
  const queue: { id: string; path: string[]; rels: string[] }[] = [
    { id: startId, path: [startId], rels: [] },
  ];
  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.path.length > MAX_DEGREES + 1) break;

    const neighbors = graph.get(current.id) || [];
    for (const edge of neighbors) {
      if (visited.has(edge.to)) continue;
      if (bloodOnly && !isBloodRelation(edge.rel) && !isAllianceRelation(edge.rel)) continue;

      const newPath = [...current.path, edge.to];
      const newRels = [...current.rels, edge.rel];

      if (edge.to === endId) {
        return [newPath, newRels];
      }

      visited.add(edge.to);
      queue.push({ id: edge.to, path: newPath, rels: newRels });
    }
  }

  return null;
};

/* ── Main Component ── */
const ShortestPath = () => {
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [selectedA, setSelectedA] = useState<MemorialOption | null>(null);
  const [selectedB, setSelectedB] = useState<MemorialOption | null>(null);
  const [pathResult, setPathResult] = useState<PathStep[] | null>(null);
  const [safePath, setSafePath] = useState<PathStep[] | null>(null);
  const [noPath, setNoPath] = useState(false);
  const [computing, setComputing] = useState(false);
  const [kinship, setKinship] = useState<KinshipAnalysis | null>(null);
  const [safeKinship, setSafeKinship] = useState<KinshipAnalysis | null>(null);

  const debouncedA = useDebounce(searchA, 300);
  const debouncedB = useDebounce(searchB, 300);

  // Autocomplete queries
  const { data: optionsA } = useQuery({
    queryKey: ["sp-search-a", debouncedA],
    enabled: debouncedA.length >= 2 && !selectedA,
    queryFn: () => searchMemorials(debouncedA),
  });

  const { data: optionsB } = useQuery({
    queryKey: ["sp-search-b", debouncedB],
    enabled: debouncedB.length >= 2 && !selectedB,
    queryFn: () => searchMemorials(debouncedB),
  });

  const compute = useCallback(async () => {
    if (!selectedA || !selectedB) return;
    setComputing(true);
    setPathResult(null);
    setSafePath(null);
    setNoPath(false);
    setKinship(null);
    setSafeKinship(null);

    try {
      // Fetch all accepted relations
      const { data: allRelations } = await supabase
        .from("memorial_relations")
        .select("memorial_id_1, memorial_id_2, relation_type")
        .eq("status", "accepted");

      if (!allRelations || allRelations.length === 0) {
        setNoPath(true);
        return;
      }

      // Build adjacency list
      const graph = new Map<string, { to: string; rel: string }[]>();
      const allIds = new Set<string>();

      for (const r of allRelations) {
        if (!r.memorial_id_1 || !r.memorial_id_2) continue;
        allIds.add(r.memorial_id_1);
        allIds.add(r.memorial_id_2);

        if (!graph.has(r.memorial_id_1)) graph.set(r.memorial_id_1, []);
        if (!graph.has(r.memorial_id_2)) graph.set(r.memorial_id_2, []);

        graph.get(r.memorial_id_1)!.push({ to: r.memorial_id_2, rel: r.relation_type });
        graph.get(r.memorial_id_2)!.push({ to: r.memorial_id_1, rel: r.relation_type });
      }

      // Fetch memorial names for path display
      const idsArray = Array.from(allIds);
      const { data: memorials } = await supabase
        .from("memorials")
        .select("id, first_name, last_name, photo_url, photos, default_photo_index, share_token")
        .in("id", idsArray.slice(0, 500));

      const memMap = new Map<string, PathNode>();
      for (const m of memorials || []) {
        const photos = (m.photos && m.photos.length > 0) ? m.photos : m.photo_url ? [m.photo_url] : [];
        const idx = (m.default_photo_index ?? 0) < photos.length ? (m.default_photo_index ?? 0) : 0;
        memMap.set(m.id, {
          id: m.id,
          name: `${m.first_name} ${m.last_name}`,
          photo: photos[idx] || null,
          shareToken: m.share_token || null,
        });
      }

      // Shortest path (any relation)
      const shortResult = bfs(graph, selectedA.id, selectedB.id, false);
      if (!shortResult) {
        setNoPath(true);
        return;
      }

      const [shortPath, shortRels] = shortResult;
      const steps: PathStep[] = shortPath.map((id, i) => ({
        node: memMap.get(id) || { id, name: "Inconnu", photo: null, shareToken: null },
        relation: i === 0 ? "" : shortRels[i - 1],
        isBlood: i === 0 ? false : isBloodRelation(shortRels[i - 1]),
      }));
      setPathResult(steps);
      setKinship(analyzeKinship(shortRels));

      // Safe path (blood + alliance only)
      const safeResult = bfs(graph, selectedA.id, selectedB.id, true);
      if (safeResult) {
        const [safePath2, safeRels] = safeResult;
        const safeSteps: PathStep[] = safePath2.map((id, i) => ({
          node: memMap.get(id) || { id, name: "Inconnu", photo: null, shareToken: null },
          relation: i === 0 ? "" : safeRels[i - 1],
          isBlood: i === 0 ? false : isBloodRelation(safeRels[i - 1]),
        }));
        setSafePath(safeSteps);
        setSafeKinship(analyzeKinship(safeRels));
      }
    } finally {
      setComputing(false);
    }
  }, [selectedA, selectedB]);

  // Generate narrative text
  const generateNarrative = (steps: PathStep[]): string => {
    if (steps.length < 2) return "";
    const parts: string[] = [];
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1].node.name;
      const curr = steps[i].node.name;
      const rel = steps[i].relation || "lié à";
      if (i === 1) {
        parts.push(`${prev} est ${rel} de ${curr}`);
      } else {
        parts.push(`qui est ${rel} de ${curr}`);
      }
    }
    return parts.join(", ") + ".";
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
        <TreePine className="w-8 h-8 text-ai-gold" />
        Pont des Vivants
      </h1>
      <p className="text-muted-foreground mb-8 font-sans">
        Découvrez les degrés de parenté entre deux personnes à travers leur héritage commun (max {MAX_DEGREES} degrés)
      </p>

      {/* Search fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <SearchField
          label="Personne A"
          value={searchA}
          onChange={(v) => { setSearchA(v); setSelectedA(null); setPathResult(null); setSafePath(null); setNoPath(false); setKinship(null); setSafeKinship(null); }}
          options={optionsA || []}
          selected={selectedA}
          onSelect={(o) => { setSelectedA(o); setSearchA(o.name); }}
        />
        <SearchField
          label="Personne B"
          value={searchB}
          onChange={(v) => { setSearchB(v); setSelectedB(null); setPathResult(null); setSafePath(null); setNoPath(false); setKinship(null); setSafeKinship(null); }}
          options={optionsB || []}
          selected={selectedB}
          onSelect={(o) => { setSelectedB(o); setSearchB(o.name); }}
        />
      </div>

      <div className="flex justify-center mb-8">
        <Button
          onClick={compute}
          disabled={!selectedA || !selectedB || computing || selectedA.id === selectedB.id}
          className="gap-2"
          size="lg"
        >
          <Search className="w-4 h-4" />
          {computing ? "Recherche en cours…" : "Trouver le chemin"}
        </Button>
      </div>

      {/* Results */}
      {noPath && (
        <Card className="border-border">
          <CardContent className="p-8 text-center">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
            <p className="font-serif text-muted-foreground">
              Aucun chemin trouvé entre ces deux personnes dans la limite de {MAX_DEGREES} degrés.
            </p>
          </CardContent>
        </Card>
      )}

      {pathResult && (
        <div className="space-y-6">
          <PathDisplay
            title="Chemin le plus court"
            steps={pathResult}
            narrative={generateNarrative(pathResult)}
            kinship={kinship}
          />
          {safePath && safePath.length !== pathResult.length && (
            <PathDisplay
              title="Chemin le plus sûr (sang & alliance)"
              steps={safePath}
              narrative={generateNarrative(safePath)}
              kinship={safeKinship}
              isSafe
            />
          )}
        </div>
      )}
    </div>
  );
};

/* ── Search Field with Autocomplete ── */
const SearchField = ({
  label,
  value,
  onChange,
  options,
  selected,
  onSelect,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: MemorialOption[];
  selected: MemorialOption | null;
  onSelect: (o: MemorialOption) => void;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Rechercher un nom…"
          className={selected ? "border-primary" : ""}
        />
        {selected && (
          <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary/10 text-primary border-primary/20 text-[10px]">
            ✓ Sélectionné
          </Badge>
        )}
      </div>
      {!selected && options.length > 0 && (
        <div className="mt-2 border border-border rounded-md max-h-48 overflow-y-auto bg-background shadow-sm">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => onSelect(o)}
              className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors text-sm"
            >
              <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
                {o.photo ? (
                  <img src={o.photo} alt="" className="w-full h-full object-cover grayscale" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-serif text-xs text-muted-foreground">
                    {o.name.charAt(0)}
                  </div>
                )}
              </div>
              <span className="font-serif truncate">{o.name}</span>
            </button>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

/* ── Path Display ── */
const PathDisplay = ({
  title,
  steps,
  narrative,
  isSafe,
  kinship,
}: {
  title: string;
  steps: PathStep[];
  narrative: string;
  isSafe?: boolean;
  kinship?: KinshipAnalysis | null;
}) => (
  <Card className={isSafe ? "border-ai-gold/30" : ""}>
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-serif flex items-center gap-2">
        <Route className={`w-4 h-4 ${isSafe ? "text-ai-gold" : "text-primary"}`} />
        {title}
        <Badge variant="outline" className="ml-auto text-xs font-sans">
          {steps.length - 1} degré{steps.length - 1 > 1 ? "s" : ""}
        </Badge>
      </CardTitle>
    </CardHeader>
    <CardContent>
      {/* Kinship Analysis Card */}
      {kinship && (
        <div className="mb-5 p-4 rounded-md border border-ai-gold/20 bg-ai-gold/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-ai-gold" />
              <span className="font-serif text-sm font-semibold text-foreground">
                {kinship.label}
              </span>
            </div>
            <Badge className="bg-ai-gold/15 text-ai-gold border-ai-gold/30 text-[10px]">
              {formatDegree(kinship.degree)}
            </Badge>
          </div>

          {kinship.commonAncestorIndex !== null && steps[kinship.commonAncestorIndex] && (
            <p className="text-xs font-sans text-muted-foreground mt-1">
              <span className="text-ai-gold">◆</span>{" "}
              Racine commune :{" "}
              <span className="font-medium text-foreground/80">
                {steps[kinship.commonAncestorIndex].node.name}
              </span>
            </p>
          )}

          {kinship.hasAlliance && (
            <p className="text-[10px] font-sans text-muted-foreground mt-1.5 italic">
              Ce lien traverse une alliance matrimoniale
            </p>
          )}

          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-[10px] font-sans text-muted-foreground">Confiance :</span>
            {[0, 1, 2].map((i) => {
              const filled = i < (kinship.confidence === "haute" ? 3 : kinship.confidence === "moyenne" ? 2 : 1);
              return (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${filled ? "bg-ai-gold" : "bg-muted-foreground/20"}`}
                />
              );
            })}
            <span className="text-[10px] font-sans text-muted-foreground capitalize ml-0.5">
              {kinship.confidence}
            </span>
          </div>
        </div>
      )}

      {/* Visual path */}
      <div className="flex items-center gap-1 overflow-x-auto pb-4">
        {steps.map((step, i) => {
          const isAncestor = kinship?.commonAncestorIndex === i;
          return (
            <div key={step.node.id} className="flex items-center gap-1 shrink-0">
              {/* Connector */}
              {i > 0 && (
                <div className="flex items-center gap-1 px-1">
                  <div
                    className={`h-[2px] w-8 md:w-12 ${
                      step.isBlood
                        ? "bg-[hsl(0,45%,30%)]/80"
                        : "bg-ai-gold/60"
                    }`}
                  />
                  <span className={`text-[9px] md:text-[10px] font-sans whitespace-nowrap ${
                    step.isBlood ? "text-[hsl(0,45%,30%)]" : "text-ai-gold"
                  }`}>
                    {step.relation}
                  </span>
                  <ArrowRight className={`w-3 h-3 ${
                    step.isBlood ? "text-[hsl(0,45%,30%)]" : "text-ai-gold"
                  }`} />
                </div>
              )}
              {/* Node */}
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full bg-muted overflow-hidden grayscale ${
                  isAncestor
                    ? "ring-2 ring-ai-gold ring-offset-2 ring-offset-background"
                    : "border border-border"
                }`}>
                  {step.node.photo ? (
                    <img src={step.node.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-serif text-sm text-muted-foreground">
                        {step.node.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                  )}
                </div>
                <span className="font-serif text-[10px] md:text-xs text-foreground text-center mt-1 max-w-[80px] truncate">
                  {step.node.name}
                </span>
                {isAncestor && (
                  <span className="text-[8px] text-ai-gold font-sans mt-0.5">◆ Racine</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Narrative */}
      <div className="mt-4 p-3 bg-muted/30 rounded-sm border border-border">
        <p className="text-sm font-serif text-foreground/80 italic">
          « {narrative} »
        </p>
      </div>
    </CardContent>
  </Card>
);

/* ── Helpers ── */
async function searchMemorials(query: string): Promise<MemorialOption[]> {
  const { data } = await supabase
    .from("memorials")
    .select("id, first_name, last_name, photo_url, photos, default_photo_index, share_token")
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .eq("is_active", true)
    .is("merged_into", null)
    .limit(10);

  if (!data) return [];
  return data.map((m) => {
    const photos = m.photos?.length ? m.photos : m.photo_url ? [m.photo_url] : [];
    const idx = (m.default_photo_index ?? 0) < photos.length ? (m.default_photo_index ?? 0) : 0;
    return {
      id: m.id,
      name: `${m.first_name} ${m.last_name}`,
      shareToken: m.share_token || null,
      photo: photos[idx] || null,
    };
  });
}

export default ShortestPath;
