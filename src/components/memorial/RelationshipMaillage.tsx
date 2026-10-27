import { useMemo, useState } from "react";
import { Users, Link2, GitBranch, ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import Photo from "@/components/ui/Photo";
import RelationConfirmation from "./RelationConfirmation";
import RelationPathsPanel from "./RelationPathsPanel";
import { useQuery } from "@tanstack/react-query";
import { fetchResolvedGraph } from "@/lib/resolvedGraphs";
import { inferAllRelationships, InferredRelationship, getCleanRelationName, getRelationWithDeceased, getGenderAwareRelation, getInverseRelation } from "@/lib/relationshipInference";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const RelationshipGraph2D = lazy(() => import("./RelationshipGraph2D"));
import { useAuth } from "@/contexts/AuthContext";
import { displayName } from "@/lib/privacyUtils";
import { formatRelationLabel } from "@/lib/formatRelationLabel";
import { inferGender } from "@/lib/genderInference";
import { getRelationCategory, getCategoryBgColor, type RelationCategoryName } from "@/lib/relationCategoryUtils";

interface RelationshipMaillageProps {
  deceasedName: string;
  memorialId?: string;
  posts: Array<{
    authorId: string;
    authorName: string;
    authorAvatarUrl?: string | null;
    relationCategory: string;
    relationLink?: string | null;
  }>;
  /** NAV-P1: "graph" = onglet Maillage (graphe seul), "inferences" = onglet Inférences (3 modules). */
  section?: "graph" | "inferences";
}

// 5 catégories ordonnées avec couleurs exactes
const ORDERED_CATEGORIES: { key: RelationCategoryName; label: string; number: string }[] = [
  { key: "Famille directe", label: "LA FAMILLE DIRECTE", number: "1" },
  { key: "Famille élargie", label: "FAMILLE ÉLARGIE", number: "2" },
  { key: "Alliés", label: "LES ALLIÉS", number: "3" },
  { key: "Socio cœur (Amis)", label: "SOCIO CŒUR", number: "4" },
  { key: "Autres", label: "AUTRES", number: "5" },
];

const confidenceBadges = {
  high: { label: "Lien direct", className: "bg-foreground/5 text-foreground border-foreground/15" },
  medium: { label: "Lien probable", className: "bg-ai-gold/10 text-ai-gold-foreground border-ai-gold/20" },
  low: { label: "Lien indirect", className: "bg-muted text-muted-foreground border-border" },
};

const RelationshipMaillage = ({ deceasedName, memorialId, posts, section = "graph" }: RelationshipMaillageProps) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [fullscreenGraph, setFullscreenGraph] = useState(false);

  // Fetch inter-memorial links (Pont des Ancêtres)
  const isValidUUID = memorialId ? /^[0-9a-f]{8}-/.test(memorialId) : false;
  const { data: interMemorialRaw } = useQuery({
    queryKey: ["memorial-relations-graph", memorialId],
    enabled: !!memorialId && isValidUUID,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: () => fetchResolvedGraph(memorialId as string, "relations", ["accepted"]),
  });
  const interMemorialLinks = useMemo(() => {
    if (!interMemorialRaw) return [];
    const nameMap = new Map(interMemorialRaw.memorials.map(m => [m.id, `${m.first_name} ${m.last_name}`]));
    const currentFirstName = deceasedName.split(' ')[0];
    const seen = new Set<string>();
    const out: Array<{ name: string; relationType: string; relationId: string }> = [];
    for (const e of interMemorialRaw.edges) {
      const relationType = e.masterIsSource
        ? getGenderAwareRelation(e.relationType, currentFirstName)
        : getInverseRelation(e.relationType, currentFirstName);
      // RIBENGA-07: dédup par relation_id canonique — deux relations distinctes
      // acceptées vers le même mémorial restent distinctes, confirmations comprises.
      const key = e.relationId;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: nameMap.get(e.linkedId) || 'Inconnu', relationType, relationId: e.relationId });
    }
    return out;
  }, [interMemorialRaw, deceasedName]);
  const directRelations = useMemo(() => {
    // ═══ DEDUP by UUID — one entry per unique author ═══
    // RIBENGA-02: no merge on name equality — authors without UUID stay distinct (index key)
    const uniqueAuthors = new Map<string, { name: string; category: string; relationLink: string | null; avatarUrl: string | null }>();
    posts.forEach((post, idx) => {
      const dedupKey = post.authorId && post.authorId.length > 0
        ? `uid::${post.authorId}`
        : `anon::${idx}`;
      if (!uniqueAuthors.has(dedupKey)) {
        uniqueAuthors.set(dedupKey, {
          name: post.authorName,
          category: post.relationCategory,
          relationLink: post.relationLink || null,
          avatarUrl: post.authorAvatarUrl || null,
        });
      }
    });
    return Array.from(uniqueAuthors.values());
  }, [posts]);

  const inferredRelationships = useMemo(() => {
    const messages = posts.map((p) => ({ authorName: p.authorName, relationCategory: p.relationLink || p.relationCategory }));
    return inferAllRelationships(messages);
  }, [posts]);

  const groupedRelations = useMemo(() => {
    const groups: Record<RelationCategoryName, Array<{ name: string; category: string; relationLink: string | null; avatarUrl: string | null }>> = {
      "Famille directe": [], "Famille élargie": [], "Alliés": [], "Socio cœur (Amis)": [], "Autres": [],
    };
    directRelations.forEach((rel) => {
      const cat = getRelationCategory(rel.relationLink || rel.category);
      groups[cat].push(rel);
    });
    return groups;
  }, [directRelations]);

  const isMaillageEmpty = directRelations.length === 0;

  if (section === "inferences") {
    return (
      <div className="space-y-8">
        <div>
          <h3 className="flex items-center gap-2 mb-2">
            <Link2 className="w-5 h-5 text-foreground/70" />
            Inférences
          </h3>
          <p className="font-serif text-muted-foreground">
            Liens attestés, déclarés et déduits autour de {deceasedName}
          </p>
        </div>
        {isMaillageEmpty ? (
          <div className="bg-muted/30 border border-border rounded-sm p-10 text-center">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-sm text-muted-foreground font-serif max-w-md mx-auto">
              Aucune relation n'est encore disponible pour {deceasedName}.
            </p>
          </div>
        ) : (
          <>
          {/* Pont des Ancêtres */}
          {interMemorialLinks && interMemorialLinks.length > 0 && (
            <div className="bg-ai-gold/5 border border-ai-gold/20 p-5 rounded-sm">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="w-4 h-4 text-ai-gold" />
                <h4 className="font-serif text-lg text-ai-gold">Pont des Ancêtres</h4>
              </div>
              <div className="space-y-2">
                {interMemorialLinks.map((link, idx) => (
                  <div key={link.relationId}>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-0.5 bg-ai-gold rounded-full" />
                    <span className="font-serif">
                      {deceasedName.split(" ")[0]} — <span className="text-ai-gold">{link.relationType}</span> de {displayName(link.name, isAuthenticated)}
                    </span>
                  </div>
                  <RelationConfirmation relationId={link.relationId} />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground font-sans">
                Une confirmation est un témoignage personnel et facultatif ; elle ne prouve ni l'identité, ni la filiation.
              </p>
            </div>
          )}

          {/* RIBENGA-06: chemins relationnels multi-sauts (liens déclarés/acceptés uniquement) */}
          {memorialId && isValidUUID && (
            <RelationPathsPanel memorialId={memorialId} deceasedName={deceasedName} />
          )}

          {/* Relations directes */}
          <div className="bg-muted/30 border border-border/60 p-6 rounded-sm">
            <div className="flex items-center gap-2 mb-5">
              <Users className="w-4 h-4 text-foreground/60" />
              <h4 className="font-serif text-lg">Relations du défunt</h4>
            </div>
            
            <div className="space-y-5">
              {ORDERED_CATEGORIES.map((cat) => {
                const members = groupedRelations[cat.key];
                if (members.length === 0) return null;
                const color = getCategoryBgColor(cat.key);
                
                return (
                  <div key={cat.key}>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color, boxShadow: cat.key === "Famille élargie" ? "0 0 0 1px rgba(0,0,0,0.15)" : undefined }}
                      />
                      <span className="text-sm font-sans font-medium tracking-wide">
                        {cat.number}. {cat.label} ({members.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 ml-4">
                      {members.map((rel, idx) => {
                        const displayRelation = rel.relationLink
                          ? formatRelationLabel(rel.relationLink, inferGender(deceasedName.split(' ')[0]))
                          : getCleanRelationName(rel.category);
                        return (
                          <div key={idx} className="flex items-center gap-2 text-sm py-1">
                            <div className="w-6 h-6 shrink-0">
                              <Photo
                                src={rel.avatarUrl}
                                alt={rel.name}
                                variant="node"
                                fallbackName={rel.name}
                                targetWidth={24}
                                targetHeight={24}
                                className="[&_span]:text-[9px] [&_span]:font-sans"
                              />
                            </div>
                            <span
                              className="inline-block text-xs font-sans px-2 py-0.5 rounded-sm"
                              style={{ color: color }}
                            >
                              {displayRelation}
                            </span>
                            <span className="font-serif text-foreground">{displayName(rel.name, isAuthenticated)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Liens inférés */}
          {inferredRelationships.length > 0 && (
            <InferredRelationshipsSection relationships={inferredRelationships} isAuthenticated={isAuthenticated} deceasedGender={inferGender(deceasedName.split(" ")[0] || "")} />
          )}

          {inferredRelationships.length === 0 && directRelations.length > 1 && (
            <div className="bg-muted/20 p-6 rounded-sm text-center border border-border/40">
              <Link2 className="w-7 h-7 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground font-serif italic">
                Pas assez d'informations pour inférer des relations entre les proches.
              </p>
            </div>
          )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h3 className="flex items-center gap-2 mb-2">
          <GitBranch className="w-5 h-5 text-foreground/70" />
          Maillage relationnel
        </h3>
        <p className="font-serif text-muted-foreground">
          Visualisation des liens autour de {deceasedName}
        </p>
      </div>

      {isMaillageEmpty ? (
        <div className="bg-muted/30 border border-border rounded-sm p-10 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
          <h4 className="text-lg font-serif mb-2">Commencer à tisser la communauté</h4>
          <p className="text-sm text-muted-foreground font-serif max-w-md mx-auto mb-3">
            Aucun hommage n'a encore été déposé. Soyez le premier à partager un souvenir 
            et à construire le maillage relationnel autour de {deceasedName}.
          </p>
          <p className="text-xs text-muted-foreground/60 font-sans italic">
            Chaque témoignage enrichit la mémoire collective et révèle les liens qui unissent les proches.
          </p>
        </div>
      ) : (
        <>
          {/* Graphe 2D */}
          <div className="relative bg-card/50 border border-border/60 rounded-sm p-4">
            <Button
              variant="ghost"
              size="sm"
              className="absolute bottom-2 right-2 sm:bottom-auto sm:top-2 z-20 h-8 w-8 p-0 bg-background/80 hover:bg-background border border-border/60"
              onClick={() => setFullscreenGraph(true)}
              aria-label="Mode immersion plein écran"
              title="Mode immersion"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Suspense fallback={<Skeleton className="w-full h-[400px] rounded-xl" />}>
              <RelationshipGraph2D deceasedName={deceasedName} posts={posts.map(p => ({ ...p, relationLink: p.relationLink }))} interMemorialLinks={interMemorialLinks || []} />
            </Suspense>
          </div>

          {/* Fullscreen Graph Dialog */}
          {fullscreenGraph && (
            <div className="fixed inset-0 z-50 bg-background flex flex-col gpu-accelerated" style={{ contain: 'layout style paint' }}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-foreground/70" />
                  <h3 className="font-serif text-lg">Maillage de {deceasedName}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setFullscreenGraph(false)}
                  aria-label="Fermer le mode immersion"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 p-4">
                <Suspense fallback={<Skeleton className="w-full h-full rounded-xl" />}>
                  <RelationshipGraph2D deceasedName={deceasedName} posts={posts.map(p => ({ ...p, relationLink: p.relationLink }))} interMemorialLinks={interMemorialLinks || []} />
                </Suspense>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
};

// Groupage par individu
interface GroupedPerson {
  name: string;
  relationWithDeceased: string;
  connections: Array<{
    otherName: string;
    otherRelationWithDeceased: string;
    inferredLink: string;
    confidence: "high" | "medium" | "low";
  }>;
  bestConfidence: "high" | "medium" | "low";
}

const groupByPerson = (relationships: InferredRelationship[], deceasedGender?: 'male' | 'female'): GroupedPerson[] => {
  const personMap = new Map<string, GroupedPerson>();
  const seenPairs = new Set<string>();

  for (const rel of relationships) {
    const pairKey = [rel.fromAuthor, rel.toAuthor].sort().join("|");
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    if (!personMap.has(rel.fromAuthor)) {
      personMap.set(rel.fromAuthor, {
        name: rel.fromAuthor,
        relationWithDeceased: getRelationWithDeceased(rel.fromRelation, deceasedGender),
        connections: [],
        bestConfidence: rel.confidence,
      });
    }
    const fromPerson = personMap.get(rel.fromAuthor)!;
    fromPerson.connections.push({
      otherName: rel.toAuthor,
      otherRelationWithDeceased: getRelationWithDeceased(rel.toRelation, deceasedGender),
      inferredLink: rel.inferredLink,
      confidence: rel.confidence,
    });
    const confOrder = { high: 0, medium: 1, low: 2 };
    if (confOrder[rel.confidence] < confOrder[fromPerson.bestConfidence]) {
      fromPerson.bestConfidence = rel.confidence;
    }
  }

  return Array.from(personMap.values()).sort((a, b) => {
    if (b.connections.length !== a.connections.length) return b.connections.length - a.connections.length;
    const confOrder = { high: 0, medium: 1, low: 2 };
    return confOrder[a.bestConfidence] - confOrder[b.bestConfidence];
  });
};

const PERSONS_PER_PAGE = 5;

const InferredRelationshipsSection = ({ relationships, isAuthenticated, deceasedGender }: { relationships: InferredRelationship[]; isAuthenticated: boolean; deceasedGender?: 'male' | 'female' }) => {
  const grouped = useMemo(() => groupByPerson(relationships, deceasedGender), [relationships, deceasedGender]);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(grouped.length / PERSONS_PER_PAGE);
  const startIndex = (currentPage - 1) * PERSONS_PER_PAGE;
  const endIndex = startIndex + PERSONS_PER_PAGE;
  const paginatedPersons = grouped.slice(startIndex, endIndex);
  const totalConnections = grouped.reduce((sum, p) => sum + p.connections.length, 0);

  return (
    <div className="bg-muted/30 border border-border/60 p-6 rounded-sm">
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="w-4 h-4 text-foreground/60" />
        <h4 className="font-serif text-lg">Liens de parenté retrouvés</h4>
        <span className="text-sm text-muted-foreground font-sans">
          ({grouped.length} personnes · {totalConnections} liens)
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-5 font-sans italic">
        Liens déduits automatiquement, groupés par individu
      </p>

      <div className="space-y-3">
        {paginatedPersons.map((person) => (
          <PersonGroupCard key={person.name} person={person} isAuthenticated={isAuthenticated} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
          <span className="text-xs text-muted-foreground font-sans">
            {startIndex + 1}–{Math.min(endIndex, grouped.length)} sur {grouped.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 px-2"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-sans px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-7 px-2"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const PersonGroupCard = ({ person, isAuthenticated }: { person: GroupedPerson; isAuthenticated: boolean }) => {
  return (
    <div className="p-4 bg-card/80 rounded-sm border border-border/40">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 shrink-0">
          <Photo
            src={null}
            alt={person.name}
            variant="node"
            fallbackName={person.name}
            className="[&_span]:text-[9px] [&_span]:font-sans"
          />
        </div>
        <span className="font-serif text-foreground font-medium">{displayName(person.name, isAuthenticated)}</span>
        <span className="text-xs text-muted-foreground font-sans">— {person.relationWithDeceased}</span>
      </div>
      <div className="space-y-1.5 ml-5">
        {person.connections.map((conn, idx) => {
          const badge = confidenceBadges[conn.confidence];
          return (
            <div key={idx} className="flex items-center gap-2 text-sm flex-wrap">
              <span className="w-1 h-1 rounded-full bg-border shrink-0" />
              <span className={`text-xs px-2 py-0.5 rounded-sm border font-serif ${badge.className}`}>
                {conn.inferredLink}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RelationshipMaillage;
