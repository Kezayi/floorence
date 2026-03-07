import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Route, Search, Users, ArrowRight, Crown, TreePine, User, AlertTriangle, CheckCircle2, XCircle, Shield, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchInput } from "@/lib/sanitizeSearch";
import { useDebounce } from "@/hooks/useDebounce";
import { analyzeKinship, formatDegree, type KinshipAnalysis, type AmbiguousLink } from "@/lib/kinshipCalculator";
import {
  scoreRelation, scorePath, classifyRelation, getDominantPathType,
  getPathTypeLabel, identifyRelay, findStrongestPath,
  generateContactPlan, type RelayInfo, type PathType,
} from "@/lib/relayScoring";

/* ── Types ── */
interface LivingOption {
  userId: string;
  name: string;
  avatar: string | null;
}

interface PathNode {
  id: string;
  name: string;
  photo: string | null;
  shareToken: string | null;
}

interface PathStep {
  node: PathNode;
  relation: string;
  isBlood: boolean;
  isLiving?: boolean;
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
): { path: string[]; rels: string[] } | null => {
  if (startId === endId) return { path: [startId], rels: [] };

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
        return { path: newPath, rels: newRels };
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
  const [selectedA, setSelectedA] = useState<LivingOption | null>(null);
  const [selectedB, setSelectedB] = useState<LivingOption | null>(null);
  const [pathResult, setPathResult] = useState<PathStep[] | null>(null);
  const [safePath, setSafePath] = useState<PathStep[] | null>(null);
  const [strongestPath, setStrongestPath] = useState<PathStep[] | null>(null);
  const [noPath, setNoPath] = useState(false);
  const [computing, setComputing] = useState(false);
  const [kinship, setKinship] = useState<KinshipAnalysis | null>(null);
  const [safeKinship, setSafeKinship] = useState<KinshipAnalysis | null>(null);
  const [strongestKinship, setStrongestKinship] = useState<KinshipAnalysis | null>(null);
  const [relay, setRelay] = useState<RelayInfo | null>(null);
  const [strongestRelay, setStrongestRelay] = useState<RelayInfo | null>(null);
  const [strongestScore, setStrongestScore] = useState(0);
  const [shortestScore, setShortestScore] = useState(0);

  const debouncedA = useDebounce(searchA, 300);
  const debouncedB = useDebounce(searchB, 300);

  const resetResults = () => {
    setPathResult(null);
    setSafePath(null);
    setStrongestPath(null);
    setNoPath(false);
    setKinship(null);
    setSafeKinship(null);
    setStrongestKinship(null);
    setRelay(null);
    setStrongestRelay(null);
    setStrongestScore(0);
    setShortestScore(0);
  };

  // Autocomplete queries for living people
  const { data: optionsA } = useQuery({
    queryKey: ["sp-living-a", debouncedA],
    enabled: debouncedA.length >= 2 && !selectedA,
    queryFn: () => searchLivingPeople(debouncedA),
  });

  const { data: optionsB } = useQuery({
    queryKey: ["sp-living-b", debouncedB],
    enabled: debouncedB.length >= 2 && !selectedB,
    queryFn: () => searchLivingPeople(debouncedB),
  });

  const compute = useCallback(async () => {
    console.log('[Pont des Vivants]', { selectedA, selectedB });
    if (!selectedA && !selectedB) {
      toast.error("Veuillez sélectionner deux personnes pour établir un lien.");
      return;
    }
    if (!selectedA) {
      toast.error("La première personne n'est pas sélectionnée.");
      return;
    }
    if (!selectedB) {
      toast.error("La deuxième personne n'est pas sélectionnée.");
      return;
    }
    setComputing(true);
    resetResults();

    try {
      // 1. Fetch memorial connections for both living people
      const [connectionsA, connectionsB] = await Promise.all([
        fetchUserMemorialConnections(selectedA.userId),
        fetchUserMemorialConnections(selectedB.userId),
      ]);

      if (connectionsA.size === 0 || connectionsB.size === 0) {
        setNoPath(true);
        return;
      }

      // 2. Fetch all accepted relations & build memorial graph
      const { data: allRelations } = await supabase
        .from("memorial_relations")
        .select("memorial_id_1, memorial_id_2, relation_type")
        .eq("status", "accepted");

      const graph = new Map<string, { to: string; rel: string }[]>();
      const allIds = new Set<string>();

      for (const r of allRelations || []) {
        if (!r.memorial_id_1 || !r.memorial_id_2) continue;
        allIds.add(r.memorial_id_1);
        allIds.add(r.memorial_id_2);
        if (!graph.has(r.memorial_id_1)) graph.set(r.memorial_id_1, []);
        if (!graph.has(r.memorial_id_2)) graph.set(r.memorial_id_2, []);
        const relType = r.relation_type;
        graph.get(r.memorial_id_1)!.push({ to: r.memorial_id_2, rel: relType });
        graph.get(r.memorial_id_2)!.push({ to: r.memorial_id_1, rel: relType });
      }

      // Add all connected memorial IDs for fetching details
      for (const id of connectionsA.keys()) allIds.add(id);
      for (const id of connectionsB.keys()) allIds.add(id);

      // 3. Fetch memorial details
      const idsArray = Array.from(allIds);
      const { data: memorials } = await supabase
        .from("memorials")
        .select("id, first_name, last_name, photo_url, photos, default_photo_index, share_token")
        .in("id", idsArray.slice(0, 500));

      const memMap = new Map<string, PathNode>();
      for (const m of memorials || []) {
        const photos = m.photos?.length ? m.photos : m.photo_url ? [m.photo_url] : [];
        const idx = (m.default_photo_index ?? 0) < photos.length ? (m.default_photo_index ?? 0) : 0;
        memMap.set(m.id, {
          id: m.id,
          name: `${m.first_name} ${m.last_name}`,
          photo: photos[idx] || null,
          shareToken: m.share_token || null,
        });
      }

      // 4. Find shortest path between any pair of A's & B's memorials
      const findBestPath = (bloodOnly: boolean) => {
        let best: { path: string[]; rels: string[]; startMemId: string; endMemId: string } | null = null;

        for (const memAId of connectionsA.keys()) {
          for (const memBId of connectionsB.keys()) {
            // Same memorial → direct connection through one ancestor
            if (memAId === memBId) {
              return { path: [memAId], rels: [] as string[], startMemId: memAId, endMemId: memBId };
            }
            const result = bfs(graph, memAId, memBId, bloodOnly);
            if (result && (!best || result.path.length < best.path.length)) {
              best = { ...result, startMemId: memAId, endMemId: memBId };
            }
          }
          if (best && best.path.length === 1) break;
        }
        return best;
      };

      // 5. Build steps with living endpoints
      const buildSteps = (
        result: { path: string[]; rels: string[]; startMemId: string; endMemId: string }
      ): PathStep[] => {
        const startRel = connectionsA.get(result.startMemId) || "Proche";
        const endRel = connectionsB.get(result.endMemId) || "Proche";

        const steps: PathStep[] = [];

        // Living person A
        steps.push({
          node: { id: selectedA!.userId, name: selectedA!.name, photo: selectedA!.avatar, shareToken: null },
          relation: "",
          isBlood: false,
          isLiving: true,
        });

        // Memorial chain (the deceased intermediaries)
        for (let i = 0; i < result.path.length; i++) {
          const memId = result.path[i];
          const node = memMap.get(memId) || { id: memId, name: "Inconnu", photo: null, shareToken: null };
          const rel = i === 0 ? startRel : result.rels[i - 1];
          steps.push({
            node,
            relation: rel,
            isBlood: isBloodRelation(rel),
            isLiving: false,
          });
        }

        // Living person B
        steps.push({
          node: { id: selectedB!.userId, name: selectedB!.name, photo: selectedB!.avatar, shareToken: null },
          relation: endRel,
          isBlood: isBloodRelation(endRel),
          isLiving: true,
        });

        return steps;
      };

      // Shortest path (any relation)
      const shortResult = findBestPath(false);
      if (!shortResult) {
        setNoPath(true);
        return;
      }

      const steps = buildSteps(shortResult);
      setPathResult(steps);

      // Kinship & score for shortest path
      const startRel = connectionsA.get(shortResult.startMemId) || "Proche";
      const endRel = connectionsB.get(shortResult.endMemId) || "Proche";
      const allRels = [startRel, ...shortResult.rels, endRel];
      setKinship(analyzeKinship(allRels));
      setShortestScore(scorePath(allRels));

      // Relay for shortest path
      const nodeNames = steps.map(s => s.node.name);
      setRelay(identifyRelay(allRels, nodeNames));

      // 6. Find STRONGEST path (weighted by trust score)
      let globalBestStrong: { path: string[]; rels: string[]; score: number; startMemId: string; endMemId: string } | null = null;

      for (const memAId of connectionsA.keys()) {
        for (const memBId of connectionsB.keys()) {
          if (memAId === memBId) continue;
          const result = findStrongestPath(graph, memAId, memBId, MAX_DEGREES);
          if (result) {
            const startR = connectionsA.get(memAId) || "Proche";
            const endR = connectionsB.get(memBId) || "Proche";
            const totalScore = scoreRelation(startR) + result.score + scoreRelation(endR);
            if (!globalBestStrong || totalScore > globalBestStrong.score) {
              globalBestStrong = { ...result, score: totalScore, startMemId: memAId, endMemId: memBId };
            }
          }
        }
      }

      // Only show strongest if different from shortest
      if (globalBestStrong && JSON.stringify(globalBestStrong.path) !== JSON.stringify(shortResult.path)) {
        const strongSteps = buildSteps(globalBestStrong);
        setStrongestPath(strongSteps);
        const strongStartRel = connectionsA.get(globalBestStrong.startMemId) || "Proche";
        const strongEndRel = connectionsB.get(globalBestStrong.endMemId) || "Proche";
        const strongAllRels = [strongStartRel, ...globalBestStrong.rels, strongEndRel];
        setStrongestKinship(analyzeKinship(strongAllRels));
        setStrongestScore(globalBestStrong.score);

        const strongNodeNames = strongSteps.map(s => s.node.name);
        setStrongestRelay(identifyRelay(strongAllRels, strongNodeNames));
      }

      // Safe path (blood + alliance only)
      const safeResult = findBestPath(true);
      if (safeResult && JSON.stringify(safeResult.path) !== JSON.stringify(shortResult.path)) {
        const safeSteps = buildSteps(safeResult);
        setSafePath(safeSteps);
        const safeStartRel = connectionsA.get(safeResult.startMemId) || "Proche";
        const safeEndRel = connectionsB.get(safeResult.endMemId) || "Proche";
        setSafeKinship(analyzeKinship([safeStartRel, ...safeResult.rels, safeEndRel]));
      }
    } finally {
      setComputing(false);
    }
  }, [selectedA, selectedB]);

  // Narrative generation adapted for living endpoints
  const generateNarrative = (steps: PathStep[]): string => {
    if (steps.length < 2) return "";
    const parts: string[] = [];
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1].node.name;
      const curr = steps[i].node.name;
      const rel = steps[i].relation || "lié à";

      // Last step: living person B — invert the relation
      if (i === steps.length - 1 && steps[i].isLiving) {
        parts.push(`dont ${curr} est ${rel}`);
      } else if (i === 1) {
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
        Découvrez comment deux personnes vivantes sont reliées à travers leur héritage mémoriel commun (max {MAX_DEGREES} degrés)
      </p>

      {/* Search fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <LivingSearchField
          label="Vivant A"
          value={searchA}
          onChange={(v) => { setSearchA(v); setSelectedA(null); resetResults(); }}
          options={optionsA || []}
          selected={selectedA}
          onSelect={(o) => { setSelectedA(o); setSearchA(o.name); }}
        />
        <LivingSearchField
          label="Vivant B"
          value={searchB}
          onChange={(v) => { setSearchB(v); setSelectedB(null); resetResults(); }}
          options={optionsB || []}
          selected={selectedB}
          onSelect={(o) => { setSelectedB(o); setSearchB(o.name); }}
        />
      </div>

      <div className="flex justify-center mb-8">
        <Button
          onClick={compute}
          disabled={!selectedA || !selectedB || computing || selectedA.userId === selectedB.userId}
          className="gap-2 active:scale-95 transition-transform"
          size="lg"
        >
          <Search className="w-4 h-4" />
          {computing ? "Recherche en cours…" : "Trouver le lien"}
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
          {/* Strongest path (primary recommendation) */}
          {strongestPath && (
            <PathDisplay
              title="Chemin le plus solide (Relais de Confiance)"
              steps={strongestPath}
              narrative={generateNarrative(strongestPath)}
              kinship={strongestKinship}
              relay={strongestRelay}
              score={strongestScore}
              isStrongest
            />
          )}

          {/* Shortest path */}
          <PathDisplay
            title={strongestPath ? "Chemin le plus court" : "Chemin le plus court (aussi le plus solide)"}
            steps={pathResult}
            narrative={generateNarrative(pathResult)}
            kinship={kinship}
            relay={!strongestPath ? relay : undefined}
            score={shortestScore}
          />

          {/* Safe path */}
          {safePath && (
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

/* ── Living Person Search Field ── */
const LivingSearchField = ({
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
  options: LivingOption[];
  selected: LivingOption | null;
  onSelect: (o: LivingOption) => void;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <User className="w-3.5 h-3.5" />
        {label}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Rechercher un vivant par nom…"
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
              key={o.userId}
              onClick={() => onSelect(o)}
              className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors text-sm"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center">
                {o.avatar ? (
                  <img src={o.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-primary" />
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

/* ── Path Display with Kinship, Relay & Score ── */
const PathDisplay = ({
  title,
  steps,
  narrative,
  isSafe,
  kinship,
  relay,
  score,
  isStrongest,
}: {
  title: string;
  steps: PathStep[];
  narrative: string;
  isSafe?: boolean;
  kinship?: KinshipAnalysis | null;
  relay?: RelayInfo | null;
  score?: number;
  isStrongest?: boolean;
}) => {
  const ambiguities = kinship?.ambiguities || [];

  return (
    <Card className={isStrongest ? "border-ai-gold/40 shadow-[0_0_15px_-5px_hsl(var(--ai-gold)/0.3)]" : isSafe ? "border-ai-gold/30" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-serif flex items-center gap-2">
          {isStrongest ? (
            <Shield className="w-4 h-4 text-ai-gold" />
          ) : (
            <Route className={`w-4 h-4 ${isSafe ? "text-ai-gold" : "text-primary"}`} />
          )}
          {title}
          <div className="ml-auto flex items-center gap-2">
            {score !== undefined && score > 0 && (
              <Badge className="bg-ai-gold/15 text-ai-gold border-ai-gold/30 text-[10px] font-sans gap-1">
                <Zap className="w-2.5 h-2.5" />
                {score} pts
              </Badge>
            )}
            <Badge variant="outline" className="text-xs font-sans">
              {steps.filter(s => !s.isLiving).length} intermédiaire{steps.filter(s => !s.isLiving).length > 1 ? "s" : ""}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Relay / Plan de Contact */}
        {relay && (
          <div className="mb-5 p-4 rounded-md border border-ai-gold/30 bg-ai-gold/5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-ai-gold" />
              <span className="font-serif text-sm font-semibold text-foreground">
                Plan de Contact
              </span>
              <Badge className="bg-ai-gold/15 text-ai-gold border-ai-gold/30 text-[10px] ml-auto">
                Relais de Confiance
              </Badge>
            </div>
            <p className="text-xs font-sans text-muted-foreground leading-relaxed">
              {relay.reason}
            </p>
            {steps[relay.stepIndex] && (
              <div className="mt-3 flex items-center gap-3 p-2 rounded-md bg-background/60 border border-ai-gold/20">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-ai-gold ring-offset-2 ring-offset-background shadow-[0_0_10px_-2px_hsl(var(--ai-gold)/0.4)]">
                  {steps[relay.stepIndex].node.photo ? (
                    <img src={steps[relay.stepIndex].node.photo!} alt="" className="w-full h-full object-cover grayscale" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <span className="font-serif text-xs text-muted-foreground">
                        {steps[relay.stepIndex].node.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-serif font-medium text-foreground">
                    {steps[relay.stepIndex].node.name}
                  </p>
                  <p className="text-[10px] font-sans text-ai-gold">
                    Score de confiance : {relay.trustScore}/20
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

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

        {/* Ambiguity Alerts */}
        {ambiguities.length > 0 && (
          <div className="mb-5 space-y-3">
            {ambiguities.map((amb, idx) => (
              <AmbiguityAlert key={idx} ambiguity={amb} steps={steps} />
            ))}
          </div>
        )}

        {/* Visual path */}
        <div className="flex items-center gap-1 overflow-x-auto pb-4">
          {steps.map((step, i) => {
            const isAncestor = kinship?.commonAncestorIndex === i;
            const isLiving = step.isLiving;
            const isAmbiguous = ambiguities.some(a => a.stepIndex === i);
            const isRelay = relay?.stepIndex === i;
            return (
              <div key={`${step.node.id}-${i}`} className="flex items-center gap-1 shrink-0">
                {/* Connector */}
                {i > 0 && (
                  <div className="flex items-center gap-1 px-1">
                    {isAmbiguous ? (
                      <div
                        className={`h-[2px] w-8 md:w-12 border-t-2 border-dashed ${
                          step.isBlood ? "border-[hsl(0,45%,30%)]/60" : "border-ai-gold/40"
                        }`}
                      />
                    ) : (
                      <div
                        className={`h-[2px] w-8 md:w-12 ${
                          step.isBlood ? "bg-[hsl(0,45%,30%)]/80" : "bg-ai-gold/60"
                        }`}
                      />
                    )}
                    <span className={`text-[9px] md:text-[10px] font-sans whitespace-nowrap ${
                      isAmbiguous ? "text-orange-500 font-medium" :
                      step.isBlood ? "text-[hsl(0,45%,30%)]" : "text-ai-gold"
                    }`}>
                      {isAmbiguous ? `${step.relation} ?` : step.relation}
                    </span>
                    <ArrowRight className={`w-3 h-3 ${
                      isAmbiguous ? "text-orange-500" :
                      step.isBlood ? "text-[hsl(0,45%,30%)]" : "text-ai-gold"
                    }`} />
                  </div>
                )}
                {/* Node */}
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden ${
                    isLiving
                      ? "bg-primary/10 ring-2 ring-primary/40 ring-offset-1 ring-offset-background"
                      : isRelay
                        ? "bg-muted grayscale ring-2 ring-ai-gold ring-offset-2 ring-offset-background shadow-[0_0_12px_-2px_hsl(var(--ai-gold)/0.5)]"
                        : isAmbiguous
                          ? "bg-muted grayscale ring-2 ring-orange-400 ring-dashed ring-offset-2 ring-offset-background"
                          : isAncestor
                            ? "bg-muted grayscale ring-2 ring-ai-gold ring-offset-2 ring-offset-background"
                            : "bg-muted grayscale border border-border"
                  }`}>
                    {step.node.photo ? (
                      <img src={step.node.photo} alt="" className={`w-full h-full object-cover ${!isLiving ? "grayscale" : ""}`} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {isLiving ? (
                          <User className="w-5 h-5 text-primary" />
                        ) : (
                          <span className="font-serif text-sm text-muted-foreground">
                            {step.node.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] md:text-xs text-center mt-1 max-w-[80px] truncate ${
                    isLiving ? "font-sans font-medium text-primary" :
                    isRelay ? "font-serif font-semibold text-ai-gold" :
                    isAmbiguous ? "font-serif text-orange-500" : "font-serif text-foreground"
                  }`}>
                    {step.node.name}
                  </span>
                  {isLiving && (
                    <span className="text-[8px] text-primary font-sans mt-0.5">Vivant</span>
                  )}
                  {isRelay && !isLiving && (
                    <span className="text-[8px] text-ai-gold font-sans mt-0.5 font-medium">★ Relais</span>
                  )}
                  {isAmbiguous && !isLiving && !isRelay && (
                    <span className="text-[8px] text-orange-500 font-sans mt-0.5">⚠ À valider</span>
                  )}
                  {isAncestor && !isLiving && !isAmbiguous && !isRelay && (
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
};

/* ── Ambiguity Alert Card ── */
const AmbiguityAlert = ({
  ambiguity,
  steps,
}: {
  ambiguity: AmbiguousLink;
  steps: PathStep[];
}) => {
  const node = steps[ambiguity.stepIndex]?.node;
  const prevNode = steps[ambiguity.stepIndex - 1]?.node;
  const nextNode = steps[ambiguity.stepIndex + 1]?.node;

  return (
    <div className="p-3 rounded-md border border-orange-400/30 bg-orange-50/50 dark:bg-orange-950/10">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-sans font-semibold text-foreground mb-1">
            Relation à valider
          </p>
          <p className="text-[11px] font-sans text-muted-foreground leading-relaxed">
            {prevNode && node && (
              <>
                <span className="font-medium text-foreground/80">{prevNode.name}</span>
                {" est potentiellement "}
              </>
            )}
            {ambiguity.alternatives.map((alt, i) => (
              <span key={i}>
                {i > 0 && (i === ambiguity.alternatives.length - 1 ? " ou " : ", ")}
                <span className="font-medium text-orange-600 dark:text-orange-400">{alt}</span>
              </span>
            ))}
            {node && (
              <>
                {" de "}
                <span className="font-medium text-foreground/80">{node.name}</span>
              </>
            )}
          </p>
          <p className="text-[10px] font-sans text-muted-foreground/70 mt-1 italic">
            {ambiguity.reason}
          </p>

          {/* Validation actions */}
          <div className="flex flex-wrap gap-2 mt-2.5">
            {ambiguity.alternatives.map((alt) => (
              <button
                key={alt}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-sans font-medium
                  rounded-md border border-border bg-background hover:bg-primary/5 hover:border-primary/30
                  transition-colors text-foreground/80"
                onClick={() => {
                  // Future: create memorial_relation entry
                  console.log(`Validated: ${prevNode?.name} is ${alt} of ${node?.name}`);
                }}
              >
                <CheckCircle2 className="w-3 h-3 text-primary" />
                {alt}
              </button>
            ))}
            <button
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-sans font-medium
                rounded-md border border-border bg-background hover:bg-destructive/5 hover:border-destructive/30
                transition-colors text-muted-foreground"
              onClick={() => {
                console.log(`Dismissed ambiguity for ${node?.name}`);
              }}
            >
              <XCircle className="w-3 h-3 text-destructive" />
              Ignorer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Helpers ── */

/** Search for living people (guestbook authors + memorial creators) */
async function searchLivingPeople(query: string): Promise<LivingOption[]> {
  const safe = sanitizeSearchInput(query);
  const [{ data: posts }, { data: profiles }] = await Promise.all([
    supabase
      .from("guestbook_posts")
      .select("user_id, author_name")
      .ilike("author_name", `%${safe}%`)
      .not("user_id", "is", null)
      .eq("is_hidden", false)
      .limit(30),
    supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .ilike("display_name", `%${safe}%`)
      .limit(20),
  ]);

  const userMap = new Map<string, { name: string; avatar: string | null }>();

  for (const p of posts || []) {
    if (p.user_id && !userMap.has(p.user_id)) {
      userMap.set(p.user_id, { name: p.author_name, avatar: null });
    }
  }

  for (const p of profiles || []) {
    if (p.user_id && !userMap.has(p.user_id) && p.display_name) {
      userMap.set(p.user_id, { name: p.display_name, avatar: p.avatar_url });
    }
  }

  return Array.from(userMap.entries()).slice(0, 10).map(([userId, info]) => ({
    userId,
    name: info.name,
    avatar: info.avatar,
  }));
}

/** Fetch all memorial connections for a living user */
async function fetchUserMemorialConnections(userId: string): Promise<Map<string, string>> {
  const [{ data: posts }, { data: created }, { data: inherited }] = await Promise.all([
    supabase
      .from("guestbook_posts")
      .select("memorial_id, relation_link, relation_category")
      .eq("user_id", userId)
      .eq("is_hidden", false),
    supabase
      .from("memorials")
      .select("id, creator_relation")
      .eq("created_by", userId)
      .eq("is_active", true)
      .is("merged_into", null),
    supabase
      .from("memorials")
      .select("id")
      .eq("heir_user_id", userId)
      .eq("is_active", true)
      .is("merged_into", null),
  ]);

  const connections = new Map<string, string>();

  for (const p of posts || []) {
    if (p.memorial_id && !connections.has(p.memorial_id)) {
      connections.set(p.memorial_id, p.relation_link || p.relation_category || "Proche");
    }
  }

  for (const m of created || []) {
    if (!connections.has(m.id)) {
      connections.set(m.id, m.creator_relation || "Créateur");
    }
  }

  for (const m of inherited || []) {
    if (!connections.has(m.id)) {
      connections.set(m.id, "Héritier");
    }
  }

  return connections;
}

export default ShortestPath;
